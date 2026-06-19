from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.match import Match
from app.models.base import utc_now
from app.models.tournament import Tournament, TournamentEntry, TournamentNode
from app.repositories.match_repository import MatchRepository
from app.repositories.player_repository import PlayerRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.tournament_repository import TournamentRepository
from app.schemas.tournament import (
    TournamentCreate,
    TournamentEntryResponse,
    TournamentNodeResponse,
    TournamentNodeScoreUpdate,
    TournamentPlayerSummary,
    TournamentResponse,
)
from app.services.match_service import MatchService

ALLOWED_TOURNAMENT_FORMATS = {"single_elimination", "double_elimination"}
SUPPORTED_BRACKET_SIZES = {2, 4, 8}
DOUBLE_ELIM_SIZES = {4, 8}


class TournamentService:
    def __init__(
        self,
        tournament_repository: TournamentRepository | None = None,
        match_repository: MatchRepository | None = None,
        player_repository: PlayerRepository | None = None,
        session_repository: SessionRepository | None = None,
        match_service: MatchService | None = None,
    ) -> None:
        self.tournament_repository = tournament_repository or TournamentRepository()
        self.match_repository = match_repository or MatchRepository()
        self.player_repository = player_repository or PlayerRepository()
        self.session_repository = session_repository or SessionRepository()
        self.match_service = match_service or MatchService(
            match_repository=self.match_repository,
            player_repository=self.player_repository,
            session_repository=self.session_repository,
        )

    def list_session_tournaments(self, db: Session, session_id: uuid.UUID) -> list[TournamentResponse]:
        session = self.session_repository.get_session(db, session_id)
        if session is None:
            raise NotFoundError("Session", str(session_id))
        tournaments = self.tournament_repository.list_for_session(db, session_id)
        return [self._response_for_tournament(db, tournament) for tournament in tournaments]

    def create_tournament(self, db: Session, session_id: uuid.UUID, payload: TournamentCreate) -> TournamentResponse:
        session = self.session_repository.get_session(db, session_id)
        if session is None:
            raise NotFoundError("Session", str(session_id))

        entries = self._validate_entries(db, payload)
        nodes = self._build_nodes(payload.format, entries)
        tournament = Tournament(
            session_id=session_id,
            name=payload.name.strip(),
            format=payload.format,
            status="draft",
            bracket_size=len(entries),
            entries=entries,
            nodes=nodes,
        )

        self._recalculate_tournament_state(tournament)
        self.tournament_repository.add(db, tournament)
        db.commit()
        return self.get_tournament(db, tournament.id)

    def get_tournament(self, db: Session, tournament_id: uuid.UUID) -> TournamentResponse:
        tournament = self.tournament_repository.get_tournament(db, tournament_id)
        if tournament is None:
            raise NotFoundError("Tournament", str(tournament_id))
        return self._response_for_tournament(db, tournament)

    def update_node_score(
        self,
        db: Session,
        tournament_id: uuid.UUID,
        node_id: uuid.UUID,
        payload: TournamentNodeScoreUpdate,
    ) -> TournamentResponse:
        tournament = self._get_draft_tournament_or_raise(db, tournament_id)
        node = next((candidate for candidate in tournament.nodes if candidate.id == node_id), None)
        if node is None:
            raise NotFoundError("Tournament node", str(node_id))
        if node.team_1_entry_id is None or node.team_2_entry_id is None:
            raise BadRequestError("This bracket game is not ready for scoring yet.")

        node.team_1_score = payload.team_1_score
        node.team_2_score = payload.team_2_score
        self._recalculate_tournament_state(tournament)
        db.commit()
        return self.get_tournament(db, tournament.id)

    def delete_tournament(self, db: Session, tournament_id: uuid.UUID) -> None:
        tournament = self.tournament_repository.get_tournament(db, tournament_id)
        if tournament is None:
            raise NotFoundError("Tournament", str(tournament_id))
        if tournament.status != "draft":
            raise BadRequestError("Only draft tournaments can be deleted.")
        self.tournament_repository.delete(db, tournament)
        db.commit()

    def finalize_tournament(self, db: Session, tournament_id: uuid.UUID) -> TournamentResponse:
        tournament = self._get_tournament_or_raise(db, tournament_id)
        if tournament.status == "finalized":
            return self._response_for_tournament(db, tournament)
        if not self._is_complete(tournament):
            raise BadRequestError("Tournament must be fully scored before it can be finalized.")

        existing_matches = self.match_repository.list_tournament_matches(db, tournament.id, include_voided=False)
        if existing_matches:
            raise BadRequestError("Tournament already has materialized matches. Revoke it before finalizing again.")

        for node in sorted(tournament.nodes, key=lambda candidate: candidate.sequence):
            if node.status != "completed" or node.team_1_entry is None or node.team_2_entry is None:
                raise BadRequestError("Tournament must be fully scored before it can be finalized.")
            self.match_service.create_materialized_tournament_match(
                db,
                session_id=tournament.session_id,
                team_1_player_ids=[node.team_1_entry.player_1_id, node.team_1_entry.player_2_id],
                team_2_player_ids=[node.team_2_entry.player_1_id, node.team_2_entry.player_2_id],
                team_1_score=node.team_1_score or 0,
                team_2_score=node.team_2_score or 0,
                tournament_id=tournament.id,
                tournament_node_id=node.id,
            )

        tournament.status = "finalized"
        tournament.finalized_at = utc_now()
        db.commit()
        return self.get_tournament(db, tournament.id)

    def revoke_tournament(self, db: Session, tournament_id: uuid.UUID) -> TournamentResponse:
        tournament = self._get_tournament_or_raise(db, tournament_id)
        if tournament.status == "draft":
            return self._response_for_tournament(db, tournament)

        materialized_matches = self.match_repository.list_tournament_matches(db, tournament.id, include_voided=True)
        if not materialized_matches:
            tournament.status = "draft"
            tournament.revoked_at = utc_now()
            db.commit()
            return self.get_tournament(db, tournament.id)

        if not self._can_revoke_materialized_matches(db, materialized_matches):
            raise BadRequestError(
                "This tournament can only be revoked while its finalized matches are still the most recent ranked block."
            )

        # Repository results already use the same newest-first ordering as ranked-void safety checks.
        for match in materialized_matches:
            if match.status == "voided":
                continue
            self.match_service.void_materialized_match(db, match)

        tournament.status = "draft"
        tournament.revoked_at = utc_now()
        db.commit()
        return self.get_tournament(db, tournament.id)

    def _get_draft_tournament_or_raise(self, db: Session, tournament_id: uuid.UUID) -> Tournament:
        tournament = self._get_tournament_or_raise(db, tournament_id)
        if tournament.status != "draft":
            raise BadRequestError("Only draft tournaments can be edited.")
        return tournament

    def _get_tournament_or_raise(self, db: Session, tournament_id: uuid.UUID) -> Tournament:
        tournament = self.tournament_repository.get_tournament(db, tournament_id)
        if tournament is None:
            raise NotFoundError("Tournament", str(tournament_id))
        return tournament

    def _validate_entries(self, db: Session, payload: TournamentCreate) -> list[TournamentEntry]:
        if payload.format not in ALLOWED_TOURNAMENT_FORMATS:
            raise BadRequestError("Unsupported tournament format.")

        name = payload.name.strip()
        if not name:
            raise BadRequestError("Tournament name is required.")

        entry_count = len(payload.entries)
        if entry_count not in SUPPORTED_BRACKET_SIZES:
            raise BadRequestError("Tournament entry count must be a power of two and is currently limited to 2, 4, or 8 teams.")
        if entry_count < 2 or not self._is_power_of_two(entry_count):
            raise BadRequestError("Tournament entry count must be a power of two with at least two teams.")
        if payload.format == "double_elimination" and entry_count not in DOUBLE_ELIM_SIZES:
            raise BadRequestError("Double elimination tournaments currently support 4 or 8 teams.")

        seeds = [entry.seed for entry in payload.entries]
        if sorted(seeds) != list(range(1, entry_count + 1)):
            raise BadRequestError("Seeds must be unique and contiguous starting at 1.")

        player_ids: list[uuid.UUID] = []
        team_keys: set[tuple[uuid.UUID, uuid.UUID]] = set()
        for entry in payload.entries:
            if entry.player_1_id == entry.player_2_id:
                raise BadRequestError(f"Seed {entry.seed} must contain two unique players.")
            player_ids.extend([entry.player_1_id, entry.player_2_id])
            team_key = tuple(sorted((entry.player_1_id, entry.player_2_id), key=str))
            if team_key in team_keys:
                raise BadRequestError("Duplicate teams are not allowed in a tournament.")
            team_keys.add(team_key)

        if len(set(player_ids)) != len(player_ids):
            raise BadRequestError("Each player can only appear on one tournament team.")

        players = self.player_repository.get_players_by_ids(db, player_ids)
        players_by_id = {player.id: player for player in players}
        if len(players_by_id) != len(set(player_ids)):
            missing_player_id = next(player_id for player_id in player_ids if player_id not in players_by_id)
            raise NotFoundError("Player", str(missing_player_id))

        inactive_players = sorted(player.display_name for player in players if not player.is_active)
        if inactive_players:
            raise BadRequestError(
                f"All tournament players must be active. Inactive players: {', '.join(inactive_players)}."
            )

        return [
            TournamentEntry(
                id=uuid.uuid4(),
                seed=entry.seed,
                player_1_id=entry.player_1_id,
                player_2_id=entry.player_2_id,
                player_1=players_by_id[entry.player_1_id],
                player_2=players_by_id[entry.player_2_id],
            )
            for entry in sorted(payload.entries, key=lambda item: item.seed)
        ]

    def _build_nodes(self, tournament_format: str, entries: list[TournamentEntry]) -> list[TournamentNode]:
        if tournament_format == "single_elimination":
            return self._build_single_elimination_nodes(entries)
        if tournament_format == "double_elimination":
            return self._build_double_elimination_nodes(entries)
        raise BadRequestError("Unsupported tournament format.")

    def _build_single_elimination_nodes(self, entries: list[TournamentEntry]) -> list[TournamentNode]:
        nodes: list[TournamentNode] = []
        sequence = 1
        seed_order = self._seed_positions(len(entries))
        entry_by_seed = {entry.seed: entry for entry in entries}

        first_round_nodes: list[TournamentNode] = []
        for slot_index in range(0, len(seed_order), 2):
            team_1_entry = entry_by_seed[seed_order[slot_index]]
            team_2_entry = entry_by_seed[seed_order[slot_index + 1]]
            node = self._create_node(
                sequence=sequence,
                bracket="winners",
                round_number=1,
                slot_number=(slot_index // 2) + 1,
                team_1_entry_id=team_1_entry.id,
                team_2_entry_id=team_2_entry.id,
            )
            sequence += 1
            nodes.append(node)
            first_round_nodes.append(node)

        previous_round = first_round_nodes
        round_number = 2
        while len(previous_round) > 1:
            current_round: list[TournamentNode] = []
            for slot_index in range(0, len(previous_round), 2):
                node = self._create_node(
                    sequence=sequence,
                    bracket="winners",
                    round_number=round_number,
                    slot_number=(slot_index // 2) + 1,
                    team_1_source_node_id=previous_round[slot_index].id,
                    team_1_source_kind="winner",
                    team_2_source_node_id=previous_round[slot_index + 1].id,
                    team_2_source_kind="winner",
                )
                sequence += 1
                nodes.append(node)
                current_round.append(node)
            previous_round = current_round
            round_number += 1

        return nodes

    def _build_double_elimination_nodes(self, entries: list[TournamentEntry]) -> list[TournamentNode]:
        if len(entries) == 4:
            return self._build_double_elimination_nodes_for_four(entries)
        if len(entries) == 8:
            return self._build_double_elimination_nodes_for_eight(entries)
        raise BadRequestError("Double elimination tournaments currently support 4 or 8 teams.")

    def _build_double_elimination_nodes_for_four(self, entries: list[TournamentEntry]) -> list[TournamentNode]:
        winners_round_one = self._build_initial_round_nodes(entries, sequence_start=1)
        w1, w2 = winners_round_one

        l1 = self._create_node(
            sequence=3,
            bracket="losers",
            round_number=1,
            slot_number=1,
            team_1_source_node_id=w1.id,
            team_1_source_kind="loser",
            team_2_source_node_id=w2.id,
            team_2_source_kind="loser",
        )
        w3 = self._create_node(
            sequence=4,
            bracket="winners",
            round_number=2,
            slot_number=1,
            team_1_source_node_id=w1.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w2.id,
            team_2_source_kind="winner",
        )
        l2 = self._create_node(
            sequence=5,
            bracket="losers",
            round_number=2,
            slot_number=1,
            team_1_source_node_id=l1.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w3.id,
            team_2_source_kind="loser",
        )
        gf = self._create_node(
            sequence=6,
            bracket="grand_final",
            round_number=1,
            slot_number=1,
            team_1_source_node_id=w3.id,
            team_1_source_kind="winner",
            team_2_source_node_id=l2.id,
            team_2_source_kind="winner",
        )
        return [*winners_round_one, l1, w3, l2, gf]

    def _build_double_elimination_nodes_for_eight(self, entries: list[TournamentEntry]) -> list[TournamentNode]:
        winners_round_one = self._build_initial_round_nodes(entries, sequence_start=1)
        w1, w2, w3, w4 = winners_round_one

        l1 = self._create_node(
            sequence=5,
            bracket="losers",
            round_number=1,
            slot_number=1,
            team_1_source_node_id=w1.id,
            team_1_source_kind="loser",
            team_2_source_node_id=w2.id,
            team_2_source_kind="loser",
        )
        l2 = self._create_node(
            sequence=6,
            bracket="losers",
            round_number=1,
            slot_number=2,
            team_1_source_node_id=w3.id,
            team_1_source_kind="loser",
            team_2_source_node_id=w4.id,
            team_2_source_kind="loser",
        )
        w5 = self._create_node(
            sequence=7,
            bracket="winners",
            round_number=2,
            slot_number=1,
            team_1_source_node_id=w1.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w2.id,
            team_2_source_kind="winner",
        )
        w6 = self._create_node(
            sequence=8,
            bracket="winners",
            round_number=2,
            slot_number=2,
            team_1_source_node_id=w3.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w4.id,
            team_2_source_kind="winner",
        )
        l3 = self._create_node(
            sequence=9,
            bracket="losers",
            round_number=2,
            slot_number=1,
            team_1_source_node_id=l1.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w5.id,
            team_2_source_kind="loser",
        )
        l4 = self._create_node(
            sequence=10,
            bracket="losers",
            round_number=2,
            slot_number=2,
            team_1_source_node_id=l2.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w6.id,
            team_2_source_kind="loser",
        )
        w7 = self._create_node(
            sequence=11,
            bracket="winners",
            round_number=3,
            slot_number=1,
            team_1_source_node_id=w5.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w6.id,
            team_2_source_kind="winner",
        )
        l5 = self._create_node(
            sequence=12,
            bracket="losers",
            round_number=3,
            slot_number=1,
            team_1_source_node_id=l3.id,
            team_1_source_kind="winner",
            team_2_source_node_id=l4.id,
            team_2_source_kind="winner",
        )
        l6 = self._create_node(
            sequence=13,
            bracket="losers",
            round_number=4,
            slot_number=1,
            team_1_source_node_id=l5.id,
            team_1_source_kind="winner",
            team_2_source_node_id=w7.id,
            team_2_source_kind="loser",
        )
        gf = self._create_node(
            sequence=14,
            bracket="grand_final",
            round_number=1,
            slot_number=1,
            team_1_source_node_id=w7.id,
            team_1_source_kind="winner",
            team_2_source_node_id=l6.id,
            team_2_source_kind="winner",
        )
        return [*winners_round_one, l1, l2, w5, w6, l3, l4, w7, l5, l6, gf]

    def _build_initial_round_nodes(self, entries: list[TournamentEntry], *, sequence_start: int) -> list[TournamentNode]:
        seed_order = self._seed_positions(len(entries))
        entry_by_seed = {entry.seed: entry for entry in entries}
        nodes: list[TournamentNode] = []
        sequence = sequence_start
        for slot_index in range(0, len(seed_order), 2):
            team_1_entry = entry_by_seed[seed_order[slot_index]]
            team_2_entry = entry_by_seed[seed_order[slot_index + 1]]
            nodes.append(
                self._create_node(
                    sequence=sequence,
                    bracket="winners",
                    round_number=1,
                    slot_number=(slot_index // 2) + 1,
                    team_1_entry_id=team_1_entry.id,
                    team_2_entry_id=team_2_entry.id,
                )
            )
            sequence += 1
        return nodes

    @staticmethod
    def _create_node(
        *,
        sequence: int,
        bracket: str,
        round_number: int,
        slot_number: int,
        team_1_entry_id: uuid.UUID | None = None,
        team_2_entry_id: uuid.UUID | None = None,
        team_1_source_node_id: uuid.UUID | None = None,
        team_1_source_kind: str | None = None,
        team_2_source_node_id: uuid.UUID | None = None,
        team_2_source_kind: str | None = None,
    ) -> TournamentNode:
        return TournamentNode(
            id=uuid.uuid4(),
            sequence=sequence,
            bracket=bracket,
            round_number=round_number,
            slot_number=slot_number,
            status="ready" if team_1_entry_id is not None and team_2_entry_id is not None else "pending",
            team_1_entry_id=team_1_entry_id,
            team_2_entry_id=team_2_entry_id,
            team_1_source_node_id=team_1_source_node_id,
            team_1_source_kind=team_1_source_kind,
            team_2_source_node_id=team_2_source_node_id,
            team_2_source_kind=team_2_source_kind,
        )

    def _recalculate_tournament_state(self, tournament: Tournament) -> None:
        nodes_by_id = {node.id: node for node in tournament.nodes}
        for node in sorted(tournament.nodes, key=lambda candidate: candidate.sequence):
            previous_team_1_id = node.team_1_entry_id
            previous_team_2_id = node.team_2_entry_id
            resolved_team_1_id = self._resolve_source_entry_id(nodes_by_id, node.team_1_source_node_id, node.team_1_source_kind)
            resolved_team_2_id = self._resolve_source_entry_id(nodes_by_id, node.team_2_source_node_id, node.team_2_source_kind)

            if node.team_1_source_node_id is not None and node.team_1_entry_id != resolved_team_1_id:
                node.team_1_entry_id = resolved_team_1_id
            if node.team_2_source_node_id is not None and node.team_2_entry_id != resolved_team_2_id:
                node.team_2_entry_id = resolved_team_2_id

            participants_ready = node.team_1_entry_id is not None and node.team_2_entry_id is not None
            if not participants_ready:
                self._clear_node_result(node)
                node.status = "pending"
                continue

            source_changed = (
                (node.team_1_source_node_id is not None and resolved_team_1_id != previous_team_1_id)
                or (node.team_2_source_node_id is not None and resolved_team_2_id != previous_team_2_id)
            )
            if source_changed:
                self._clear_node_result(node)

            if node.team_1_score is None and node.team_2_score is None:
                node.winner_entry_id = None
                node.loser_entry_id = None
                node.status = "ready"
                continue

            if node.team_1_score is None or node.team_2_score is None or node.team_1_score == node.team_2_score:
                self._clear_node_result(node)
                node.status = "ready"
                continue

            if node.team_1_score > node.team_2_score:
                node.winner_entry_id = node.team_1_entry_id
                node.loser_entry_id = node.team_2_entry_id
            else:
                node.winner_entry_id = node.team_2_entry_id
                node.loser_entry_id = node.team_1_entry_id
            node.status = "completed"

    @staticmethod
    def _resolve_source_entry_id(
        nodes_by_id: dict[uuid.UUID, TournamentNode],
        source_node_id: uuid.UUID | None,
        source_kind: str | None,
    ) -> uuid.UUID | None:
        if source_node_id is None:
            return None
        source_node = nodes_by_id[source_node_id]
        if source_kind == "winner":
            return source_node.winner_entry_id
        if source_kind == "loser":
            return source_node.loser_entry_id
        raise BadRequestError("Unsupported tournament node source.")

    @staticmethod
    def _clear_node_result(node: TournamentNode) -> None:
        node.team_1_score = None
        node.team_2_score = None
        node.winner_entry_id = None
        node.loser_entry_id = None

    @staticmethod
    def _seed_positions(size: int) -> list[int]:
        if size == 1:
            return [1]
        previous = TournamentService._seed_positions(size // 2)
        positions: list[int] = []
        for seed in previous:
            positions.extend([seed, size + 1 - seed])
        return positions

    @staticmethod
    def _is_power_of_two(value: int) -> bool:
        return value > 0 and (value & (value - 1)) == 0

    def _response_for_tournament(self, db: Session, tournament: Tournament) -> TournamentResponse:
        materialized_matches = self.match_repository.list_tournament_matches(db, tournament.id)
        return self._to_tournament_response(
            tournament,
            materialized_matches=materialized_matches,
            can_revoke=self._can_revoke_materialized_matches(db, materialized_matches),
        )

    @classmethod
    def _to_tournament_response(
        cls,
        tournament: Tournament,
        *,
        materialized_matches: list[Match],
        can_revoke: bool | None = None,
    ) -> TournamentResponse:
        return TournamentResponse(
            id=tournament.id,
            session_id=tournament.session_id,
            name=tournament.name,
            format=tournament.format,
            status=tournament.status,
            bracket_size=tournament.bracket_size,
            finalized_at=tournament.finalized_at,
            revoked_at=tournament.revoked_at,
            created_at=tournament.created_at,
            updated_at=tournament.updated_at,
            can_finalize=tournament.status == "draft" and cls._is_complete(tournament),
            can_revoke=(tournament.status == "finalized" and can_revoke) if can_revoke is not None else False,
            materialized_match_count=len([match for match in materialized_matches if match.status != "voided"]),
            entries=[cls._to_entry_response(entry) for entry in tournament.entries],
            nodes=[cls._to_node_response(node) for node in tournament.nodes],
        )

    @staticmethod
    def _is_complete(tournament: Tournament) -> bool:
        return len(tournament.nodes) > 0 and all(node.status == "completed" for node in tournament.nodes)

    def _can_revoke_materialized_matches(self, db: Session, materialized_matches: list[Match]) -> bool:
        active_materialized = [match for match in materialized_matches if match.status != "voided"]
        if not active_materialized:
            return True
        latest_ranked_match = self.match_repository.get_latest_ranked_completed_match(db)
        if latest_ranked_match is None:
            return False
        active_materialized_ids = {match.id for match in active_materialized}
        return latest_ranked_match.id in active_materialized_ids

    @classmethod
    def _to_node_response(cls, node: TournamentNode) -> TournamentNodeResponse:
        return TournamentNodeResponse(
            id=node.id,
            bracket=node.bracket,
            round_number=node.round_number,
            slot_number=node.slot_number,
            status=node.status,
            team_1=cls._to_entry_response(node.team_1_entry) if node.team_1_entry is not None else None,
            team_2=cls._to_entry_response(node.team_2_entry) if node.team_2_entry is not None else None,
            team_1_score=node.team_1_score,
            team_2_score=node.team_2_score,
            winner_entry_id=node.winner_entry_id,
        )

    @staticmethod
    def _to_entry_response(entry: TournamentEntry | None) -> TournamentEntryResponse:
        if entry is None:
            raise BadRequestError("Tournament entry is required for this response.")
        return TournamentEntryResponse(
            id=entry.id,
            seed=entry.seed,
            player_1=TournamentPlayerSummary(id=entry.player_1.id, display_name=entry.player_1.display_name),
            player_2=TournamentPlayerSummary(id=entry.player_2.id, display_name=entry.player_2.display_name),
        )
