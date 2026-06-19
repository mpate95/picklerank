from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.player import Player
    from app.models.session import Session


class Tournament(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tournaments"

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("sessions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    format: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    bracket_size: Mapped[int] = mapped_column(Integer, nullable=False)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["Session"] = relationship(back_populates="tournaments")
    entries: Mapped[list["TournamentEntry"]] = relationship(
        back_populates="tournament",
        cascade="all, delete-orphan",
        order_by="TournamentEntry.seed",
    )
    nodes: Mapped[list["TournamentNode"]] = relationship(
        back_populates="tournament",
        cascade="all, delete-orphan",
        order_by="TournamentNode.sequence",
    )


class TournamentEntry(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "tournament_entries"
    __table_args__ = (
        UniqueConstraint("tournament_id", "seed", name="uq_tournament_entries_tournament_id_seed"),
    )

    tournament_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("tournaments.id", ondelete="CASCADE"),
        nullable=False,
    )
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    player_1_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("players.id", ondelete="RESTRICT"),
        nullable=False,
    )
    player_2_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("players.id", ondelete="RESTRICT"),
        nullable=False,
    )

    tournament: Mapped["Tournament"] = relationship(back_populates="entries")
    player_1: Mapped["Player"] = relationship(foreign_keys=[player_1_id])
    player_2: Mapped["Player"] = relationship(foreign_keys=[player_2_id])


class TournamentNode(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "tournament_nodes"
    __table_args__ = (
        UniqueConstraint("tournament_id", "sequence", name="uq_tournament_nodes_tournament_id_sequence"),
        UniqueConstraint("tournament_id", "bracket", "round_number", "slot_number", name="uq_tournament_nodes_bracket_round_slot"),
    )

    tournament_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("tournaments.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    bracket: Mapped[str] = mapped_column(String, nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    team_1_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    team_2_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    team_1_source_node_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    team_1_source_kind: Mapped[str | None] = mapped_column(String, nullable=True)
    team_2_source_node_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    team_2_source_kind: Mapped[str | None] = mapped_column(String, nullable=True)
    winner_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    loser_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    team_1_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_2_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tournament: Mapped["Tournament"] = relationship(back_populates="nodes")
    team_1_entry: Mapped["TournamentEntry | None"] = relationship(foreign_keys=[team_1_entry_id])
    team_2_entry: Mapped["TournamentEntry | None"] = relationship(foreign_keys=[team_2_entry_id])
    winner_entry: Mapped["TournamentEntry | None"] = relationship(foreign_keys=[winner_entry_id])
    loser_entry: Mapped["TournamentEntry | None"] = relationship(foreign_keys=[loser_entry_id])
