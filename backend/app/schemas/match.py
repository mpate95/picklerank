from __future__ import annotations

import uuid

from pydantic import BaseModel, Field, model_validator


class MatchTeamCreate(BaseModel):
    player_ids: list[uuid.UUID]
    score: int = Field(ge=0)


class MatchCreate(BaseModel):
    session_id: uuid.UUID
    match_type: str = "doubles"
    is_ranked: bool = True
    team_1: MatchTeamCreate
    team_2: MatchTeamCreate


class MatchUpdate(BaseModel):
    session_id: uuid.UUID | None = None
    team_1: MatchTeamCreate | None = None
    team_2: MatchTeamCreate | None = None

    @model_validator(mode="after")
    def validate_non_empty(self) -> "MatchUpdate":
        if self.model_dump(exclude_unset=True) == {}:
            raise ValueError("At least one field must be provided.")
        return self


class MatchPlayerSummary(BaseModel):
    id: uuid.UUID
    display_name: str


class MatchRatingEventResponse(BaseModel):
    player_id: uuid.UUID
    rating_before: float
    rating_after: float
    rating_change: float


class MatchTeamResponse(BaseModel):
    players: list[MatchPlayerSummary]
    score: int
    is_winner: bool


class MatchTournamentSummary(BaseModel):
    id: uuid.UUID
    name: str
    format: str
    bracket: str
    round_number: int
    slot_number: int


class MatchResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    match_type: str
    is_ranked: bool
    status: str
    tournament: MatchTournamentSummary | None = None
    team_1: MatchTeamResponse
    team_2: MatchTeamResponse
    rating_events: list[MatchRatingEventResponse]
