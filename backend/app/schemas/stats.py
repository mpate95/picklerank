import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.ranking import RatingHistoryPoint


class PlayerStatsResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    games_played: int
    wins: int
    losses: int
    win_percentage: float
    points_for: int
    points_against: int
    point_differential: int
    avg_points_for: float
    avg_points_against: float
    current_streak: str


class PlayerMatchHistoryResponse(BaseModel):
    match_id: uuid.UUID
    session_id: uuid.UUID
    session_date: date
    is_ranked: bool
    result: str
    team_score: int
    opponent_score: int


class PlayerDetailStatsResponse(PlayerStatsResponse):
    recent_form: list[str]
    match_history: list[PlayerMatchHistoryResponse]
    rating_history: list[RatingHistoryPoint]


class TeamStatsResponse(BaseModel):
    player_1_id: uuid.UUID
    player_1_name: str
    player_2_id: uuid.UUID
    player_2_name: str
    games_played: int
    wins: int
    losses: int
    win_percentage: float
    point_differential: int
    current_streak: str
