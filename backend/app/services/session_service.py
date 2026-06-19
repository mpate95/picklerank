import uuid

from sqlalchemy.orm import Session

from app.core.errors import BadRequestError, NotFoundError
from app.models.session import Session as PickleSession
from app.repositories.match_repository import MatchRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.session import SessionCreate, SessionDetailResponse, SessionResponse, SessionUpdate
from app.services.match_service import MatchService
from app.services.tournament_service import TournamentService


class SessionService:
    def __init__(
        self,
        repository: SessionRepository | None = None,
        match_repository: MatchRepository | None = None,
    ) -> None:
        self.repository = repository or SessionRepository()
        self.match_repository = match_repository or MatchRepository()
        self.match_service = MatchService(match_repository=self.match_repository, session_repository=self.repository)
        self.tournament_service = TournamentService(session_repository=self.repository)

    def list_sessions(self, db: Session) -> list[SessionResponse]:
        sessions = self.repository.list_sessions(db)
        return [self._to_session_response(session) for session in sessions]

    def create_session(self, db: Session, payload: SessionCreate) -> SessionResponse:
        session = PickleSession(
            name=payload.name,
            session_date=payload.session_date,
            location=payload.location,
            notes=payload.notes,
            is_completed=payload.is_completed,
        )
        self.repository.add(db, session)
        db.commit()
        db.refresh(session)
        return self._to_session_response(session)

    def get_session(self, db: Session, session_id: uuid.UUID) -> SessionDetailResponse:
        session = self._get_session_or_raise(db, session_id)
        return SessionDetailResponse(
            **self._to_session_response(session).model_dump(),
            created_at=session.created_at,
            updated_at=session.updated_at,
            matches=self.match_service.list_session_matches(db, session.id),
            tournaments=self.tournament_service.list_session_tournaments(db, session.id),
        )

    def update_session(self, db: Session, session_id: uuid.UUID, payload: SessionUpdate) -> SessionResponse:
        session = self._get_session_or_raise(db, session_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(session, field, value)
        db.commit()
        db.refresh(session)
        return self._to_session_response(session)

    def delete_session(self, db: Session, session_id: uuid.UUID) -> None:
        session = self._get_session_or_raise(db, session_id)
        if self.match_repository.count_for_session(db, session_id, include_voided=True) > 0:
            raise BadRequestError("Sessions with matches cannot be deleted.")
        self.repository.delete(db, session)
        db.commit()

    def _get_session_or_raise(self, db: Session, session_id: uuid.UUID) -> PickleSession:
        session = self.repository.get_session(db, session_id)
        if session is None:
            raise NotFoundError("Session", str(session_id))
        return session

    @staticmethod
    def _to_session_response(session: PickleSession) -> SessionResponse:
        return SessionResponse(
            id=session.id,
            name=session.name,
            session_date=session.session_date,
            location=session.location,
            notes=session.notes,
            is_completed=session.is_completed,
            match_count=len([match for match in session.matches if match.status != "voided"]),
        )
