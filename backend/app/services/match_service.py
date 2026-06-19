from __future__ import annotations

import decimal
import math
import uuid
from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.match import Match, MatchTeam, MatchTeamPlayer
from app.models.player import Player
from app.models.rating_event import RatingEvent
from app.repositories.match_repository import MatchRepository
from app.repositories.player_repository import PlayerRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.match import (
    MatchCreate,
    MatchPlayerSummary,
    MatchRatingEventResponse,
    MatchResponse,
    MatchTeamCreate,
    MatchTeamResponse,
    MatchTournamentSummary,
    MatchUpdate,
)

K_FACTOR = decimal.Decimal("32")
RATING_PRECISION = decimal.Decimal("0.01")


class MatchService:
    def __init__(
        self,
        match_repository: MatchRepository | None = None,
        player_repository: PlayerRepository | None = None,
        session_repository: SessionRepository | None = None,
    ) -> None:
        self.match_repository = match_repository or MatchRepository()
        self.player_repository = player_repository or PlayerRepository()
        self.session_repository = session_repository or SessionRepository()

    def list_matches(
        self,
        db: Session,
        *,
        session_id: uuid.UUID | None = None,
        player_id: uuid.UUID | None = None,
        ranked_only: bool = False,
    ) -> list[MatchResponse]:
        matches = self.match_repository.list_matches(
            db,
            session_id=session_id,
            player_id=player_id,
            ranked_only=ranked_only,
        )
        return [self._to_match_response(match) for match in matches]

    def create_match(self, db: Session, payload: MatchCreate) -> MatchResponse:
        match = self._create_match_record(db, payload)
        db.commit()
        session = self.session_repository.get_session(db, payload.session_id)
        if session is not None:
            db.refresh(session)
        return self._to_match_response(self._get_match_or_raise(db, match.id))

    def create_materialized_tournament_match(
        self,
        db: Session,
        *,
        session_id: uuid.UUID,
        team_1_player_ids: list[uuid.UUID],
        team_2_player_ids: list[uuid.UUID],
        team_1_score: int,
        team_2_score: int,
        tournament_id: uuid.UUID,
        tournament_node_id: uuid.UUID,
    ) -> Match:
        payload = MatchCreate(
            session_id=session_id,
            match_type="doubles",
            is_ranked=True,
            team_1=MatchTeamCreate(player_ids=team_1_player_ids, score=team_1_score),
            team_2=MatchTeamCreate(player_ids=team_2_player_ids, score=team_2_score),
        )
        return self._create_match_record(
            db,
            payload,
            tournament_id=tournament_id,
            tournament_node_id=tournament_node_id,
        )

    def _create_match_record(
        self,
        db: Session,
        payload: MatchCreate,
        *,
        tournament_id: uuid.UUID | None = None,
        tournament_node_id: uuid.UUID | None = None,
    ) -> Match:
        session = self.session_repository.get_session(db, payload.session_id)
        if session is None:
            raise NotFoundError("Session", str(payload.session_id))

        team_1_players, team_2_players = self._validate_match_payload(
            db,
            team_1=payload.team_1,
            team_2=payload.team_2,
            match_type=payload.match_type,
        )
        team_1_wins = payload.team_1.score > payload.team_2.score

        match = Match(
            session_id=session.id,
            tournament_id=tournament_id,
            tournament_node_id=tournament_node_id,
            match_type=payload.match_type,
            is_ranked=payload.is_ranked,
            status="completed",
            teams=[
                self._build_team(1, payload.team_1, team_1_players, is_winner=team_1_wins),
                self._build_team(2, payload.team_2, team_2_players, is_winner=not team_1_wins),
            ],
        )

        if payload.is_ranked:
            self._apply_ranked_rating_changes(
                team_1_players=team_1_players,
                team_2_players=team_2_players,
                match=match,
                team_1_wins=team_1_wins,
            )

        self.match_repository.add(db, match)
        db.flush()
        return match

    def get_match(self, db: Session, match_id: uuid.UUID) -> MatchResponse:
        return self._to_match_response(self._get_match_or_raise(db, match_id))

    def update_match(self, db: Session, match_id: uuid.UUID, payload: MatchUpdate) -> MatchResponse:
        match = self._get_match_or_raise(db, match_id)
        if match.status == "voided":
            raise BadRequestError("Voided matches cannot be edited.")
        if match.is_ranked:
            raise BadRequestError("Editing ranked matches is not supported. Void and re-enter the match instead.")

        if payload.session_id is not None:
            session = self.session_repository.get_session(db, payload.session_id)
            if session is None:
                raise NotFoundError("Session", str(payload.session_id))
            match.session_id = payload.session_id

        if payload.team_1 is not None or payload.team_2 is not None:
            if payload.team_1 is None or payload.team_2 is None:
                raise BadRequestError("Updating teams requires both team_1 and team_2.")

            team_1_players, team_2_players = self._validate_match_payload(
                db,
                team_1=payload.team_1,
                team_2=payload.team_2,
                match_type=match.match_type,
            )
            team_1_wins = payload.team_1.score > payload.team_2.score
            for existing_team in match.teams:
                existing_team.team_players.clear()
            match.teams.clear()
            match.teams.extend(
                [
                    self._build_team(1, payload.team_1, team_1_players, is_winner=team_1_wins),
                    self._build_team(2, payload.team_2, team_2_players, is_winner=not team_1_wins),
                ]
            )

        db.commit()
        return self._to_match_response(self._get_match_or_raise(db, match.id))

    def void_match(self, db: Session, match_id: uuid.UUID) -> MatchResponse:
        match = self._get_match_or_raise(db, match_id)
        self._void_match_record(db, match)
        db.commit()
        return self._to_match_response(self._get_match_or_raise(db, match.id))

    def void_materialized_match(self, db: Session, match: Match) -> None:
        self._void_match_record(db, match)

    def _void_match_record(self, db: Session, match: Match) -> None:
        if match.status == "voided":
            raise BadRequestError("Match is already voided.")

        if match.is_ranked:
            latest_ranked_match = self.match_repository.get_latest_ranked_completed_match(db)
            if latest_ranked_match is None or latest_ranked_match.id != match.id:
                raise BadRequestError(
                    "Only the most recent ranked match can be voided until historical recalculation is implemented."
                )
            for rating_event in match.rating_events:
                rating_event.player.rating.rating = rating_event.rating_before

        match.status = "voided"
        db.flush()

    def count_session_matches(self, db: Session, session_id: uuid.UUID, *, include_voided: bool = False) -> int:
        return self.match_repository.count_for_session(db, session_id, include_voided=include_voided)

    def list_session_matches(self, db: Session, session_id: uuid.UUID) -> list[MatchResponse]:
        return self.list_matches(db, session_id=session_id)

    def _get_match_or_raise(self, db: Session, match_id: uuid.UUID) -> Match:
        match = self.match_repository.get_match(db, match_id)
        if match is None:
            raise NotFoundError("Match", str(match_id))
        return match

    def _validate_match_payload(
        self,
        db: Session,
        *,
        team_1: MatchTeamCreate,
        team_2: MatchTeamCreate,
        match_type: str,
    ) -> tuple[list[Player], list[Player]]:
        if match_type not in {"singles", "doubles"}:
            raise BadRequestError("Match type must be either singles or doubles.")
        if team_1.score == team_2.score:
            raise BadRequestError("Team scores cannot be equal.")

        unique_player_ids = set([*team_1.player_ids, *team_2.player_ids])
        if match_type == "singles":
            if len(team_1.player_ids) != 1 or len(team_2.player_ids) != 1:
                raise BadRequestError("Each singles team must contain exactly one player.")
            if len(unique_player_ids) != 2:
                raise BadRequestError("A singles match must contain two unique players.")
        else:
            if len(team_1.player_ids) != 2 or len(team_2.player_ids) != 2:
                raise BadRequestError("Each doubles team must contain exactly two players.")
            if len(unique_player_ids) != 4:
                raise BadRequestError("A doubles match must contain four unique players.")

        players = self.player_repository.get_players_by_ids(db, list(unique_player_ids))
        players_by_id = {player.id: player for player in players}
        expected_player_count = 2 if match_type == "singles" else 4
        if len(players_by_id) != expected_player_count:
            missing_player_ids = unique_player_ids.difference(players_by_id.keys())
            missing_player_id = next(iter(missing_player_ids))
            raise NotFoundError("Player", str(missing_player_id))

        inactive_players = [player.display_name for player in players if not player.is_active]
        if inactive_players:
            raise BadRequestError(f"All players must be active. Inactive players: {', '.join(sorted(inactive_players))}.")

        return (
            [players_by_id[player_id] for player_id in team_1.player_ids],
            [players_by_id[player_id] for player_id in team_2.player_ids],
        )

    def _apply_ranked_rating_changes(
        self,
        *,
        team_1_players: list[Player],
        team_2_players: list[Player],
        match: Match,
        team_1_wins: bool,
    ) -> None:
        team_1_rating = self._average_rating(team_1_players)
        team_2_rating = self._average_rating(team_2_players)
        expected_team_1 = self._expected_score(team_1_rating, team_2_rating)
        team_1_actual = decimal.Decimal("1") if team_1_wins else decimal.Decimal("0")
        team_1_change = self._quantize(K_FACTOR * (team_1_actual - expected_team_1))
        team_2_change = -team_1_change

        self._create_rating_events(match, team_1_players, team_1_change)
        self._create_rating_events(match, team_2_players, team_2_change)

    @staticmethod
    def _build_team(
        team_number: int,
        payload: MatchTeamCreate,
        players: list[Player],
        *,
        is_winner: bool,
    ) -> MatchTeam:
        return MatchTeam(
            team_number=team_number,
            score=payload.score,
            is_winner=is_winner,
            team_players=[MatchTeamPlayer(player_id=player.id, player=player) for player in players],
        )

    def _create_rating_events(self, match: Match, players: Iterable[Player], delta: decimal.Decimal) -> None:
        for player in players:
            rating_before = self._quantize(player.rating.rating)
            rating_after = self._quantize(rating_before + delta)
            player.rating.rating = rating_after
            match.rating_events.append(
                RatingEvent(
                    player_id=player.id,
                    player=player,
                    rating_before=rating_before,
                    rating_after=rating_after,
                    rating_change=delta,
                )
            )

    @staticmethod
    def _average_rating(players: list[Player]) -> decimal.Decimal:
        return sum((decimal.Decimal(player.rating.rating) for player in players), decimal.Decimal("0")) / decimal.Decimal(
            len(players)
        )

    @staticmethod
    def _expected_score(team_rating: decimal.Decimal, opponent_rating: decimal.Decimal) -> decimal.Decimal:
        exponent = float((opponent_rating - team_rating) / decimal.Decimal("400"))
        expected_score = 1 / (1 + math.pow(10, exponent))
        return decimal.Decimal(str(expected_score))

    @staticmethod
    def _quantize(value: decimal.Decimal) -> decimal.Decimal:
        return decimal.Decimal(value).quantize(RATING_PRECISION, rounding=decimal.ROUND_HALF_UP)

    @classmethod
    def _to_match_response(cls, match: Match) -> MatchResponse:
        teams_by_number = {team.team_number: team for team in match.teams}
        return MatchResponse(
            id=match.id,
            session_id=match.session_id,
            match_type=match.match_type,
            is_ranked=match.is_ranked,
            status=match.status,
            tournament=(
                MatchTournamentSummary(
                    id=match.tournament.id,
                    name=match.tournament.name,
                    format=match.tournament.format,
                    bracket=match.tournament_node.bracket,
                    round_number=match.tournament_node.round_number,
                    slot_number=match.tournament_node.slot_number,
                )
                if match.tournament is not None and match.tournament_node is not None
                else None
            ),
            team_1=cls._to_team_response(teams_by_number[1]),
            team_2=cls._to_team_response(teams_by_number[2]),
            rating_events=[
                MatchRatingEventResponse(
                    player_id=event.player_id,
                    rating_before=float(event.rating_before),
                    rating_after=float(event.rating_after),
                    rating_change=float(event.rating_change),
                )
                for event in match.rating_events
            ],
        )

    @staticmethod
    def _to_team_response(team: MatchTeam) -> MatchTeamResponse:
        return MatchTeamResponse(
            players=[
                MatchPlayerSummary(id=team_player.player.id, display_name=team_player.player.display_name)
                for team_player in team.team_players
            ],
            score=team.score,
            is_winner=team.is_winner,
        )
