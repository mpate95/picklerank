import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.ranking import CurrentRankingResponse, PlayerRatingTrendResponse, RatingHistoryPoint
from app.services.ranking_service import RankingService

router = APIRouter(prefix="/rankings", tags=["rankings"])
service = RankingService()


@router.get("/current", response_model=list[CurrentRankingResponse])
def get_current_rankings(db: Session = Depends(get_db)) -> list[CurrentRankingResponse]:
    return service.get_current_rankings(db)


@router.get("/history/{player_id}", response_model=list[RatingHistoryPoint])
def get_player_rating_history(player_id: uuid.UUID, db: Session = Depends(get_db)) -> list[RatingHistoryPoint]:
    return service.get_player_rating_history(db, player_id)


@router.get("/history", response_model=list[PlayerRatingTrendResponse])
def get_all_rating_history(
    player_ids: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PlayerRatingTrendResponse]:
    parsed_player_ids = None
    if player_ids:
        parsed_player_ids = [uuid.UUID(player_id.strip()) for player_id in player_ids.split(",") if player_id.strip()]
    return service.get_all_rating_history(db, player_ids=parsed_player_ids)
