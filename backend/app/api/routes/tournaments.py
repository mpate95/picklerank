import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import require_admin_write
from app.core.database import get_db
from app.schemas.tournament import TournamentCreate, TournamentNodeScoreUpdate, TournamentResponse
from app.services.tournament_service import TournamentService

router = APIRouter(tags=["tournaments"])
service = TournamentService()


@router.get("/sessions/{session_id}/tournaments", response_model=list[TournamentResponse])
def list_session_tournaments(session_id: uuid.UUID, db: Session = Depends(get_db)) -> list[TournamentResponse]:
    return service.list_session_tournaments(db, session_id)


@router.post("/sessions/{session_id}/tournaments", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
def create_tournament(
    session_id: uuid.UUID,
    payload: TournamentCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> TournamentResponse:
    return service.create_tournament(db, session_id, payload)


@router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
def get_tournament(tournament_id: uuid.UUID, db: Session = Depends(get_db)) -> TournamentResponse:
    return service.get_tournament(db, tournament_id)


@router.patch("/tournaments/{tournament_id}/nodes/{node_id}", response_model=TournamentResponse)
def update_tournament_node_score(
    tournament_id: uuid.UUID,
    node_id: uuid.UUID,
    payload: TournamentNodeScoreUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> TournamentResponse:
    return service.update_node_score(db, tournament_id, node_id, payload)


@router.post("/tournaments/{tournament_id}/finalize", response_model=TournamentResponse)
def finalize_tournament(
    tournament_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> TournamentResponse:
    return service.finalize_tournament(db, tournament_id)


@router.post("/tournaments/{tournament_id}/revoke", response_model=TournamentResponse)
def revoke_tournament(
    tournament_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> TournamentResponse:
    return service.revoke_tournament(db, tournament_id)


@router.delete("/tournaments/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> Response:
    service.delete_tournament(db, tournament_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
