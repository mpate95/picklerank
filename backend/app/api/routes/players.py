import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import require_admin_write
from app.core.database import get_db
from app.schemas.player import PlayerCreate, PlayerDetailResponse, PlayerResponse, PlayerUpdate
from app.services.player_service import PlayerService

router = APIRouter(prefix="/players", tags=["players"])
service = PlayerService()


@router.get("", response_model=list[PlayerResponse])
def list_players(
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db),
) -> list[PlayerResponse]:
    return service.list_players(db, active_only=active_only)


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
def create_player(
    payload: PlayerCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> PlayerResponse:
    return service.create_player(db, payload)


@router.get("/{player_id}", response_model=PlayerDetailResponse)
def get_player(player_id: uuid.UUID, db: Session = Depends(get_db)) -> PlayerDetailResponse:
    return service.get_player(db, player_id)


@router.patch("/{player_id}", response_model=PlayerResponse)
def update_player(
    player_id: uuid.UUID,
    payload: PlayerUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> PlayerResponse:
    return service.update_player(db, player_id, payload)


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_player(
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> Response:
    service.deactivate_player(db, player_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
