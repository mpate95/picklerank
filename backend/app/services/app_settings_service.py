from sqlalchemy.orm import Session

from app.repositories.app_settings_repository import AppSettingsRepository
from app.schemas.app_settings import LeaderboardSettingsResponse, LeaderboardSettingsUpdate


class AppSettingsService:
    def __init__(self, repository: AppSettingsRepository | None = None) -> None:
        self.repository = repository or AppSettingsRepository()

    def get_leaderboard_settings(self, db: Session) -> LeaderboardSettingsResponse:
        settings = self.repository.get_or_create_settings(db)
        return self._to_leaderboard_settings_response(settings)

    def update_leaderboard_settings(
        self,
        db: Session,
        payload: LeaderboardSettingsUpdate,
    ) -> LeaderboardSettingsResponse:
        settings = self.repository.get_or_create_settings(db)
        settings.leaderboard_qualifier_enabled = payload.leaderboard_qualifier_enabled
        settings.leaderboard_qualifier_min_games = payload.leaderboard_qualifier_min_games
        db.commit()
        db.refresh(settings)
        return self._to_leaderboard_settings_response(settings)

    @staticmethod
    def _to_leaderboard_settings_response(settings) -> LeaderboardSettingsResponse:
        return LeaderboardSettingsResponse(
            leaderboard_qualifier_enabled=settings.leaderboard_qualifier_enabled,
            leaderboard_qualifier_min_games=settings.leaderboard_qualifier_min_games,
        )
