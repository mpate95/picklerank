import decimal
import uuid

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.player import Player
from app.models.rating import PlayerRating
from app.repositories.player_repository import PlayerRepository
from app.schemas.player import PlayerCreate, PlayerDetailResponse, PlayerResponse, PlayerUpdate
from app.services.ranking_service import RankingService

STARTING_RATING = decimal.Decimal("1000.00")


class PlayerService:
    def __init__(self, repository: PlayerRepository | None = None) -> None:
        self.repository = repository or PlayerRepository()
        self.ranking_service = RankingService()

    def list_players(self, db: Session, *, active_only: bool = True) -> list[PlayerResponse]:
        players = self.repository.list_players(db, active_only=active_only)
        return [self._to_player_response(player) for player in players]

    def create_player(self, db: Session, payload: PlayerCreate) -> PlayerResponse:
        player = Player(
            display_name=payload.display_name,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            is_active=True,
            rating=PlayerRating(rating=STARTING_RATING),
        )
        self.repository.add(db, player)
        db.commit()
        db.refresh(player)
        return self._to_player_response(player)

    def get_player(self, db: Session, player_id: uuid.UUID) -> PlayerDetailResponse:
        player = self._get_player_or_raise(db, player_id)
        current_rank = self._get_current_rank(db, player)
        return self._to_player_detail_response(player, current_rank=current_rank)

    def update_player(self, db: Session, player_id: uuid.UUID, payload: PlayerUpdate) -> PlayerResponse:
        player = self._get_player_or_raise(db, player_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(player, field, value)
        db.commit()
        db.refresh(player)
        return self._to_player_response(player)

    def deactivate_player(self, db: Session, player_id: uuid.UUID) -> None:
        player = self._get_player_or_raise(db, player_id)
        player.is_active = False
        db.commit()

    def _get_player_or_raise(self, db: Session, player_id: uuid.UUID) -> Player:
        player = self.repository.get_player(db, player_id)
        if player is None:
            raise NotFoundError("Player", str(player_id))
        return player

    def _get_current_rank(self, db: Session, player: Player) -> int | None:
        if not player.is_active:
            return None
        for ranked_player in self.ranking_service.get_current_rankings(db):
            if ranked_player.player_id == player.id:
                return ranked_player.rank
        return None

    @staticmethod
    def _to_player_response(player: Player) -> PlayerResponse:
        return PlayerResponse(
            id=player.id,
            display_name=player.display_name,
            first_name=player.first_name,
            last_name=player.last_name,
            email=player.email,
            is_active=player.is_active,
            rating=float(player.rating.rating),
        )

    @classmethod
    def _to_player_detail_response(cls, player: Player, *, current_rank: int | None) -> PlayerDetailResponse:
        return PlayerDetailResponse(**cls._to_player_response(player).model_dump(), current_rank=current_rank)
