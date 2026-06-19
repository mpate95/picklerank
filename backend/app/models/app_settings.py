from sqlalchemy import Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AppSettings(TimestampMixin, Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    leaderboard_qualifier_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    leaderboard_qualifier_min_games: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
