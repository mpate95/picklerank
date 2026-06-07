import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.match import Match
from app.models.player import Player
from app.models.rating_event import RatingEvent


class RankingRepository:
    def list_active_players_with_ratings(self, db: Session) -> list[Player]:
        query = (
            select(Player)
            .options(joinedload(Player.rating))
            .where(Player.is_active.is_(True))
            .order_by(Player.display_name.asc())
        )
        return list(db.scalars(query).unique())

    def get_player_with_rating(self, db: Session, player_id: uuid.UUID) -> Player | None:
        query = select(Player).options(joinedload(Player.rating)).where(Player.id == player_id)
        return db.scalar(query)

    def list_rating_events_for_player(self, db: Session, player_id: uuid.UUID) -> list[RatingEvent]:
        query = (
            select(RatingEvent)
            .options(joinedload(RatingEvent.match).joinedload(Match.session))
            .where(RatingEvent.player_id == player_id)
            .order_by(RatingEvent.created_at.asc(), RatingEvent.id.asc())
        )
        return list(db.scalars(query))

    def list_rating_events_for_players(self, db: Session, player_ids: list[uuid.UUID] | None = None) -> list[RatingEvent]:
        query = (
            select(RatingEvent)
            .options(joinedload(RatingEvent.match).joinedload(Match.session))
            .order_by(RatingEvent.created_at.asc(), RatingEvent.id.asc())
        )
        if player_ids is not None:
            query = query.where(RatingEvent.player_id.in_(player_ids))
        return list(db.scalars(query))
