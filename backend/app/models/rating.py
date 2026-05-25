import decimal
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.player import Player


class PlayerRating(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "player_ratings"

    player_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[decimal.Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=decimal.Decimal("1000.00"),
    )

    player: Mapped["Player"] = relationship(back_populates="rating")
