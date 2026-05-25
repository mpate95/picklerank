import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.player import Player


class PlayerRepository:
    def list_players(self, db: Session, *, active_only: bool = True) -> list[Player]:
        query = select(Player).options(joinedload(Player.rating)).order_by(Player.display_name.asc())
        if active_only:
            query = query.where(Player.is_active.is_(True))
        return list(db.scalars(query).unique())

    def get_player(self, db: Session, player_id: uuid.UUID) -> Player | None:
        query = select(Player).options(joinedload(Player.rating)).where(Player.id == player_id)
        return db.scalar(query)

    def get_players_by_ids(self, db: Session, player_ids: list[uuid.UUID]) -> list[Player]:
        query = (
            select(Player)
            .options(joinedload(Player.rating))
            .where(Player.id.in_(player_ids))
            .order_by(Player.display_name.asc())
        )
        return list(db.scalars(query).unique())

    def add(self, db: Session, player: Player) -> Player:
        db.add(player)
        return player
