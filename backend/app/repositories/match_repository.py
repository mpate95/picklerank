import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.match import Match, MatchTeam, MatchTeamPlayer


class MatchRepository:
    def list_matches(
        self,
        db: Session,
        *,
        session_id: uuid.UUID | None = None,
        player_id: uuid.UUID | None = None,
        ranked_only: bool = False,
        include_voided: bool = False,
    ) -> list[Match]:
        query = self._base_query()
        if not include_voided:
            query = query.where(Match.status != "voided")
        if session_id is not None:
            query = query.where(Match.session_id == session_id)
        if ranked_only:
            query = query.where(Match.is_ranked.is_(True))
        if player_id is not None:
            query = query.join(Match.teams).join(MatchTeam.team_players).where(MatchTeamPlayer.player_id == player_id)
        return list(db.scalars(query).unique())

    def get_match(self, db: Session, match_id: uuid.UUID) -> Match | None:
        query = self._base_query().where(Match.id == match_id)
        return db.scalar(query)

    def add(self, db: Session, match: Match) -> Match:
        db.add(match)
        return match

    def count_for_session(self, db: Session, session_id: uuid.UUID, *, include_voided: bool = True) -> int:
        query = select(func.count(Match.id)).where(Match.session_id == session_id)
        if not include_voided:
            query = query.where(Match.status != "voided")
        return int(db.scalar(query) or 0)

    def get_latest_ranked_completed_match(self, db: Session) -> Match | None:
        query = self._base_query().where(Match.is_ranked.is_(True), Match.status == "completed")
        return db.scalar(query.limit(1))

    @staticmethod
    def _base_query():
        return (
            select(Match)
            .options(
                joinedload(Match.session),
                selectinload(Match.teams)
                .selectinload(MatchTeam.team_players)
                .joinedload(MatchTeamPlayer.player),
                selectinload(Match.rating_events),
            )
            .order_by(Match.created_at.desc(), Match.id.desc())
        )
