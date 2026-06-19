from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

TournamentFormat = Literal["single_elimination", "double_elimination"]
TournamentStatus = Literal["draft", "finalized"]


class TournamentEntryCreate(BaseModel):
    seed: int = Field(ge=1)
    player_1_id: uuid.UUID
    player_2_id: uuid.UUID


class TournamentCreate(BaseModel):
    name: str
    format: TournamentFormat
    entries: list[TournamentEntryCreate]

    @model_validator(mode="after")
    def validate_non_empty(self) -> "TournamentCreate":
        if len(self.entries) == 0:
            raise ValueError("At least one tournament entry is required.")
        return self


class TournamentPlayerSummary(BaseModel):
    id: uuid.UUID
    display_name: str


class TournamentEntryResponse(BaseModel):
    id: uuid.UUID
    seed: int
    player_1: TournamentPlayerSummary
    player_2: TournamentPlayerSummary


class TournamentNodeScoreUpdate(BaseModel):
    team_1_score: int | None = Field(default=None, ge=0)
    team_2_score: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_score_pair(self) -> "TournamentNodeScoreUpdate":
        if (self.team_1_score is None) != (self.team_2_score is None):
            raise ValueError("Both team scores must be provided together.")
        if self.team_1_score is not None and self.team_2_score is not None and self.team_1_score == self.team_2_score:
            raise ValueError("Team scores cannot be equal.")
        return self


class TournamentNodeResponse(BaseModel):
    id: uuid.UUID
    bracket: str
    round_number: int
    slot_number: int
    status: str
    team_1: TournamentEntryResponse | None = None
    team_2: TournamentEntryResponse | None = None
    team_1_score: int | None = None
    team_2_score: int | None = None
    winner_entry_id: uuid.UUID | None = None


class TournamentResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    name: str
    format: TournamentFormat
    status: TournamentStatus
    bracket_size: int
    finalized_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    can_finalize: bool
    can_revoke: bool
    materialized_match_count: int
    entries: list[TournamentEntryResponse]
    nodes: list[TournamentNodeResponse]
