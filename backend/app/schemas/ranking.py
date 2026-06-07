import uuid
from datetime import date

from pydantic import BaseModel


class CurrentRankingResponse(BaseModel):
    rank: int
    player_id: uuid.UUID
    display_name: str
    rating: float
    rating_change_last_session: float
    games_played: int
    wins: int
    losses: int
    win_percentage: float


class RatingHistoryPoint(BaseModel):
    date: date
    rating: float
    rating_change: float


class PlayerRatingTrendResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    points: list[RatingHistoryPoint]
