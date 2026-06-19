import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.tournament import Tournament, TournamentEntry, TournamentNode


class TournamentRepository:
    def list_for_session(self, db: Session, session_id: uuid.UUID) -> list[Tournament]:
        query = self._base_query().where(Tournament.session_id == session_id)
        return list(db.scalars(query).unique())

    def get_tournament(self, db: Session, tournament_id: uuid.UUID) -> Tournament | None:
        query = self._base_query().where(Tournament.id == tournament_id)
        return db.scalar(query)

    def add(self, db: Session, tournament: Tournament) -> Tournament:
        db.add(tournament)
        return tournament

    def delete(self, db: Session, tournament: Tournament) -> None:
        db.delete(tournament)

    @staticmethod
    def _base_query():
        return (
            select(Tournament)
            .options(
                joinedload(Tournament.session),
                selectinload(Tournament.entries).joinedload(TournamentEntry.player_1),
                selectinload(Tournament.entries).joinedload(TournamentEntry.player_2),
                selectinload(Tournament.nodes).joinedload(TournamentNode.team_1_entry).joinedload(TournamentEntry.player_1),
                selectinload(Tournament.nodes).joinedload(TournamentNode.team_1_entry).joinedload(TournamentEntry.player_2),
                selectinload(Tournament.nodes).joinedload(TournamentNode.team_2_entry).joinedload(TournamentEntry.player_1),
                selectinload(Tournament.nodes).joinedload(TournamentNode.team_2_entry).joinedload(TournamentEntry.player_2),
            )
            .order_by(Tournament.created_at.desc(), Tournament.id.desc())
        )
