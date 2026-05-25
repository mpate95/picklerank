import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import require_admin_write
from app.core.database import get_db
from app.schemas.session import SessionCreate, SessionDetailResponse, SessionResponse, SessionUpdate
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])
service = SessionService()


@router.get("", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db)) -> list[SessionResponse]:
    return service.list_sessions(db)


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> SessionResponse:
    return service.create_session(db, payload)


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: uuid.UUID, db: Session = Depends(get_db)) -> SessionDetailResponse:
    return service.get_session(db, session_id)


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> SessionResponse:
    return service.update_session(db, session_id, payload)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> Response:
    service.delete_session(db, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
