import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.ranking import RatingHistoryPoint


class DashboardTopPlayerResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    rating: float


class DashboardLastSessionMvpResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    wins: int
    losses: int
    point_differential: int


class DashboardBestWinPercentageResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    win_percentage: float
    games_played: int


class DashboardMostGamesPlayedResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    games_played: int


class DashboardLeaderboardEntry(BaseModel):
    rank: int
    player_id: uuid.UUID
    display_name: str
    rating: float
    wins: int
    losses: int
    win_percentage: float


class DashboardRecentMatchResponse(BaseModel):
    match_id: uuid.UUID
    session_date: date
    team_1_names: list[str]
    team_1_score: int
    team_2_names: list[str]
    team_2_score: int
    winner_team_number: int


class DashboardRatingTrendResponse(BaseModel):
    player_id: uuid.UUID
    display_name: str
    points: list[RatingHistoryPoint]


class DashboardSummaryResponse(BaseModel):
    top_player: DashboardTopPlayerResponse | None
    last_session_mvp: DashboardLastSessionMvpResponse | None
    best_win_percentage: DashboardBestWinPercentageResponse | None
    most_games_played: DashboardMostGamesPlayedResponse | None
    leaderboard: list[DashboardLeaderboardEntry]
    recent_matches: list[DashboardRecentMatchResponse]
    rating_trends: list[DashboardRatingTrendResponse]
