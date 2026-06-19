from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.match import Match
from app.models.player import Player
from app.models.rating_event import RatingEvent
from app.services.app_settings_service import AppSettingsService
from app.repositories.match_repository import MatchRepository
from app.repositories.ranking_repository import RankingRepository
from app.schemas.ranking import CurrentRankingResponse, PlayerRatingTrendResponse, RatingHistoryPoint


@dataclass
class PlayerMatchStats:
    games_played: int = 0
    wins: int = 0
    losses: int = 0


class RankingService:
    def __init__(
        self,
        ranking_repository: RankingRepository | None = None,
        match_repository: MatchRepository | None = None,
        app_settings_service: AppSettingsService | None = None,
    ) -> None:
        self.ranking_repository = ranking_repository or RankingRepository()
        self.match_repository = match_repository or MatchRepository()
        self.app_settings_service = app_settings_service or AppSettingsService()

    def get_current_rankings(self, db: Session) -> list[CurrentRankingResponse]:
        players = self.ranking_repository.list_active_players_with_ratings(db)
        settings = self.app_settings_service.get_leaderboard_settings(db)
        stats_by_player = self._build_stats_by_player(
            self.match_repository.list_matches(db, include_voided=False)
        )
        eligible_players = [
            player
            for player in players
            if self.is_player_leaderboard_qualified(
                stats=stats_by_player.get(player.id, PlayerMatchStats()),
                qualifier_enabled=settings.leaderboard_qualifier_enabled,
                qualifier_min_games=settings.leaderboard_qualifier_min_games,
            )
        ]

        ranked_players = sorted(
            eligible_players,
            key=lambda player: self._ranking_sort_key(
                player,
                stats_by_player.get(player.id, PlayerMatchStats()),
            ),
        )
        leaderboard: list[CurrentRankingResponse] = []
        for index, player in enumerate(ranked_players, start=1):
            stats = stats_by_player.get(player.id, PlayerMatchStats())
            leaderboard.append(
                CurrentRankingResponse(
                    rank=index,
                    player_id=player.id,
                    display_name=player.display_name,
                    rating=float(player.rating.rating),
                    rating_change_last_session=self._rating_change_last_session(db, player.id),
                    games_played=stats.games_played,
                    wins=stats.wins,
                    losses=stats.losses,
                    win_percentage=self._win_percentage(stats),
                )
            )
        return leaderboard

    def get_leaderboard_qualification_status(self, db: Session, player_id: uuid.UUID) -> tuple[bool, int]:
        settings = self.app_settings_service.get_leaderboard_settings(db)
        if not settings.leaderboard_qualifier_enabled:
            return True, settings.leaderboard_qualifier_min_games

        stats_by_player = self._build_stats_by_player(
            self.match_repository.list_matches(db, include_voided=False)
        )
        is_qualified = self.is_player_leaderboard_qualified(
            stats=stats_by_player.get(player_id, PlayerMatchStats()),
            qualifier_enabled=settings.leaderboard_qualifier_enabled,
            qualifier_min_games=settings.leaderboard_qualifier_min_games,
        )
        return is_qualified, settings.leaderboard_qualifier_min_games

    def get_player_rating_history(self, db: Session, player_id: uuid.UUID) -> list[RatingHistoryPoint]:
        player = self.ranking_repository.get_player_with_rating(db, player_id)
        if player is None:
            raise NotFoundError("Player", str(player_id))
        return self._history_points_for_player(db, player)

    def get_player_match_rating_history(self, db: Session, player_id: uuid.UUID) -> list[RatingHistoryPoint]:
        player = self.ranking_repository.get_player_with_rating(db, player_id)
        if player is None:
            raise NotFoundError("Player", str(player_id))
        return self._match_history_points_for_player(db, player)

    def get_all_rating_history(
        self,
        db: Session,
        *,
        player_ids: list[uuid.UUID] | None = None,
    ) -> list[PlayerRatingTrendResponse]:
        if player_ids is None:
            players = self.ranking_repository.list_active_players_with_ratings(db)
        else:
            players = []
            for player_id in player_ids:
                player = self.ranking_repository.get_player_with_rating(db, player_id)
                if player is None:
                    raise NotFoundError("Player", str(player_id))
                players.append(player)

        return [
            PlayerRatingTrendResponse(
                player_id=player.id,
                display_name=player.display_name,
                points=self._history_points_for_player(db, player),
            )
            for player in sorted(players, key=lambda player: player.display_name.lower())
        ]

    def _history_points_for_player(self, db: Session, player: Player) -> list[RatingHistoryPoint]:
        events = self.ranking_repository.list_rating_events_for_player(db, player.id)
        points = [
            RatingHistoryPoint(
                date=player.created_at.date(),
                rating=1000.0,
                rating_change=0.0,
            )
        ]
        points.extend(self._session_points_for_events(events))
        return points

    def _match_history_points_for_player(self, db: Session, player: Player) -> list[RatingHistoryPoint]:
        events = self.ranking_repository.list_rating_events_for_player(db, player.id)
        points = [
            RatingHistoryPoint(
                date=player.created_at.date(),
                rating=1000.0,
                rating_change=0.0,
            )
        ]
        points.extend(self._match_points_for_events(events))
        return points

    @staticmethod
    def _build_stats_by_player(matches: list[Match]) -> dict[uuid.UUID, PlayerMatchStats]:
        stats_by_player: dict[uuid.UUID, PlayerMatchStats] = {}
        for match in matches:
            for team in match.teams:
                for team_player in team.team_players:
                    player_stats = stats_by_player.setdefault(team_player.player_id, PlayerMatchStats())
                    player_stats.games_played += 1
                    if team.is_winner:
                        player_stats.wins += 1
                    else:
                        player_stats.losses += 1
        return stats_by_player

    def _rating_change_last_session(self, db: Session, player_id: uuid.UUID) -> float:
        player = self.ranking_repository.get_player_with_rating(db, player_id)
        if player is None:
            raise NotFoundError("Player", str(player_id))
        history = self._history_points_for_player(db, player)
        if len(history) <= 1:
            return 0.0
        latest_point = history[-1]
        return float(latest_point.rating_change)

    @staticmethod
    def is_player_leaderboard_qualified(
        *,
        stats: PlayerMatchStats,
        qualifier_enabled: bool,
        qualifier_min_games: int,
    ) -> bool:
        if not qualifier_enabled:
            return True
        return stats.games_played >= qualifier_min_games

    @staticmethod
    def _win_percentage(stats: PlayerMatchStats) -> float:
        if stats.games_played == 0:
            return 0.0
        return round(stats.wins / stats.games_played, 3)

    @classmethod
    def _ranking_sort_key(cls, player: Player, stats: PlayerMatchStats) -> tuple[float, float, int, int, str, str]:
        return (
            -float(player.rating.rating),
            -cls._win_percentage(stats),
            -stats.wins,
            -stats.games_played,
            player.display_name.lower(),
            str(player.id),
        )

    @staticmethod
    def _session_points_for_events(events: list[RatingEvent]) -> list[RatingHistoryPoint]:
        points: list[RatingHistoryPoint] = []
        current_session_date: date | None = None
        current_rating_after = 0.0
        current_rating_change = 0.0

        for event in events:
            session_date = event.match.session.session_date
            if current_session_date is None:
                current_session_date = session_date
            elif session_date != current_session_date:
                points.append(
                    RatingHistoryPoint(
                        date=current_session_date,
                        rating=current_rating_after,
                        rating_change=current_rating_change,
                    )
                )
                current_session_date = session_date
                current_rating_change = 0.0

            current_rating_after = float(event.rating_after)
            current_rating_change += float(event.rating_change)

        if current_session_date is not None:
            points.append(
                RatingHistoryPoint(
                    date=current_session_date,
                    rating=current_rating_after,
                    rating_change=current_rating_change,
                )
            )

        return points

    @staticmethod
    def _match_points_for_events(events: list[RatingEvent]) -> list[RatingHistoryPoint]:
        return [
            RatingHistoryPoint(
                date=event.match.session.session_date,
                rating=float(event.rating_after),
                rating_change=float(event.rating_change),
            )
            for event in events
        ]
