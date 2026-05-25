import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.session import Session as PickleSession


class SessionRepository:
    def list_sessions(self, db: Session) -> list[PickleSession]:
        query = select(PickleSession).order_by(PickleSession.session_date.desc(), PickleSession.name.asc())
        return list(db.scalars(query))

    def get_session(self, db: Session, session_id: uuid.UUID) -> PickleSession | None:
        query = select(PickleSession).where(PickleSession.id == session_id)
        return db.scalar(query)

    def get_sessions_by_ids(self, db: Session, session_ids: list[uuid.UUID]) -> list[PickleSession]:
        query = select(PickleSession).where(PickleSession.id.in_(session_ids))
        return list(db.scalars(query))

    def add(self, db: Session, session: PickleSession) -> PickleSession:
        db.add(session)
        return session

    def delete(self, db: Session, session: PickleSession) -> None:
        db.delete(session)
