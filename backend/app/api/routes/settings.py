from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes.auth import require_admin_write
from app.core.database import get_db
from app.schemas.app_settings import LeaderboardSettingsResponse, LeaderboardSettingsUpdate
from app.services.app_settings_service import AppSettingsService

router = APIRouter(prefix="/settings", tags=["settings"])
service = AppSettingsService()


@router.get("/leaderboard", response_model=LeaderboardSettingsResponse)
def get_leaderboard_settings(db: Session = Depends(get_db)) -> LeaderboardSettingsResponse:
    return service.get_leaderboard_settings(db)


@router.patch("/leaderboard", response_model=LeaderboardSettingsResponse)
def update_leaderboard_settings(
    payload: LeaderboardSettingsUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_write),
) -> LeaderboardSettingsResponse:
    return service.update_leaderboard_settings(db, payload)
