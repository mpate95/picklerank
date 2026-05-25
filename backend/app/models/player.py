from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.match import MatchTeamPlayer
    from app.models.rating import PlayerRating
    from app.models.rating_event import RatingEvent


class Player(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "players"

    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    rating: Mapped["PlayerRating"] = relationship(
        back_populates="player",
        cascade="all, delete-orphan",
        uselist=False,
    )
    match_team_players: Mapped[list["MatchTeamPlayer"]] = relationship(back_populates="player")
    rating_events: Mapped[list["RatingEvent"]] = relationship(back_populates="player")
