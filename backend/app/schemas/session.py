import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator


class SessionBase(BaseModel):
    name: str
    session_date: date
    location: str | None = None
    notes: str | None = None
    is_completed: bool = False


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    name: str | None = None
    session_date: date | None = None
    location: str | None = None
    notes: str | None = None
    is_completed: bool | None = None

    @model_validator(mode="after")
    def validate_non_empty(self) -> "SessionUpdate":
        if self.model_dump(exclude_unset=True) == {}:
            raise ValueError("At least one field must be provided.")
        return self


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    session_date: date
    location: str | None = None
    notes: str | None = None
    is_completed: bool
    match_count: int


class SessionDetailResponse(SessionResponse):
    created_at: datetime
    updated_at: datetime
    matches: list[dict[str, object]]
