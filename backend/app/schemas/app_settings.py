from pydantic import BaseModel, Field


class LeaderboardSettingsResponse(BaseModel):
    leaderboard_qualifier_enabled: bool
    leaderboard_qualifier_min_games: int


class LeaderboardSettingsUpdate(BaseModel):
    leaderboard_qualifier_enabled: bool
    leaderboard_qualifier_min_games: int = Field(ge=0)
