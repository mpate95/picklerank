import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import require_admin_write
from app.core.database import get_db
from app.schemas.match import MatchCreate, MatchResponse, MatchUpdate
from app.services.match_service import MatchService

router = APIRouter(prefix="/matches", tags=["matches"])
service = MatchService()


@router.get("", response_model=list[MatchResponse])
def list_matches(
    session_id: uuid.UUID | None = Query(default=None),
    player_id: uuid.UUID | None = Query(default=None),
    ranked_only: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[MatchResponse]:
    return service.list_matches(db, session_id=session_id, player_id=player_id, ranked_only=ranked_only)


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(
    payload: MatchCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> MatchResponse:
    return service.create_match(db, payload)


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: uuid.UUID, db: Session = Depends(get_db)) -> MatchResponse:
    return service.get_match(db, match_id)


@router.patch("/{match_id}", response_model=MatchResponse)
def update_match(
    match_id: uuid.UUID,
    payload: MatchUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> MatchResponse:
    return service.update_match(db, match_id, payload)


@router.delete("/{match_id}", response_model=MatchResponse)
def void_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> MatchResponse:
    return service.void_match(db, match_id)
