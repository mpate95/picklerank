import uuid

from pydantic import BaseModel, ConfigDict, model_validator


class PlayerBase(BaseModel):
    display_name: str
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(BaseModel):
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None

    @model_validator(mode="after")
    def validate_non_empty(self) -> "PlayerUpdate":
        if self.model_dump(exclude_unset=True) == {}:
            raise ValueError("At least one field must be provided.")
        return self


class PlayerResponse(PlayerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    rating: float


class PlayerDetailResponse(PlayerResponse):
    current_rank: int | None = None
