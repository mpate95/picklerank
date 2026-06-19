import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.stats import PlayerDetailStatsResponse, PlayerStatsResponse, TeamStatsResponse
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])
service = StatsService()


@router.get("/players", response_model=list[PlayerStatsResponse])
def get_player_stats(db: Session = Depends(get_db)) -> list[PlayerStatsResponse]:
    return service.get_player_stats(db)


@router.get("/players/{player_id}", response_model=PlayerDetailStatsResponse)
def get_single_player_stats(player_id: uuid.UUID, db: Session = Depends(get_db)) -> PlayerDetailStatsResponse:
    return service.get_single_player_stats(db, player_id)


@router.get("/teams", response_model=list[TeamStatsResponse])
def get_team_stats(db: Session = Depends(get_db)) -> list[TeamStatsResponse]:
    return service.get_team_stats(db)


@router.get("/singles", response_model=list[PlayerStatsResponse])
def get_singles_stats(db: Session = Depends(get_db)) -> list[PlayerStatsResponse]:
    return service.get_singles_stats(db)
