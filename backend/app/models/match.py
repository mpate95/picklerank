from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.player import Player
    from app.models.rating_event import RatingEvent
    from app.models.session import Session
    from app.models.tournament import Tournament, TournamentNode


class Match(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "matches"

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("sessions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournaments.id", ondelete="SET NULL"),
        nullable=True,
    )
    tournament_node_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(),
        ForeignKey("tournament_nodes.id", ondelete="SET NULL"),
        nullable=True,
    )
    match_type: Mapped[str] = mapped_column(String, nullable=False, default="doubles")
    is_ranked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="completed")

    session: Mapped["Session"] = relationship(back_populates="matches")
    tournament: Mapped["Tournament | None"] = relationship()
    tournament_node: Mapped["TournamentNode | None"] = relationship()
    teams: Mapped[list["MatchTeam"]] = relationship(
        back_populates="match",
        cascade="all, delete-orphan",
        order_by="MatchTeam.team_number",
    )
    rating_events: Mapped[list["RatingEvent"]] = relationship(
        back_populates="match",
        cascade="all, delete-orphan",
        order_by="RatingEvent.created_at",
    )


class MatchTeam(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "match_teams"
    __table_args__ = (UniqueConstraint("match_id", "team_number", name="uq_match_teams_match_id_team_number"),)

    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_number: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    is_winner: Mapped[bool] = mapped_column(Boolean, nullable=False)

    match: Mapped["Match"] = relationship(back_populates="teams")
    team_players: Mapped[list["MatchTeamPlayer"]] = relationship(
        back_populates="match_team",
        cascade="all, delete-orphan",
    )


class MatchTeamPlayer(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "match_team_players"
    __table_args__ = (UniqueConstraint("match_team_id", "player_id", name="uq_match_team_players_match_team_id_player_id"),)

    match_team_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("match_teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("players.id", ondelete="RESTRICT"),
        nullable=False,
    )

    match_team: Mapped["MatchTeam"] = relationship(back_populates="team_players")
    player: Mapped["Player"] = relationship(back_populates="match_team_players")
