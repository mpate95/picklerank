from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings


class AppSettingsRepository:
    def get_settings(self, db: Session) -> AppSettings | None:
        return db.scalar(select(AppSettings).where(AppSettings.id == 1))

    def get_or_create_settings(self, db: Session) -> AppSettings:
        settings = self.get_settings(db)
        if settings is not None:
            return settings

        settings = AppSettings(id=1)
        db.add(settings)
        db.flush()
        return settings
