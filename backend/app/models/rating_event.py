from __future__ import annotations

import decimal
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from app.models.match import Match
    from app.models.player import Player


class RatingEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "rating_events"

    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("players.id", ondelete="RESTRICT"),
        nullable=False,
    )
    rating_before: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    rating_after: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    rating_change: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    match: Mapped["Match"] = relationship(back_populates="rating_events")
    player: Mapped["Player"] = relationship(back_populates="rating_events")
