"""Add draft tournament tables.

Revision ID: 0007_add_tournaments
Revises: 0006_app_settings
Create Date: 2026-06-19 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_add_tournaments"
down_revision: str | None = "0006_app_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tournaments",
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("format", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("bracket_size", sa.Integer(), nullable=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "tournament_entries",
        sa.Column("tournament_id", sa.Uuid(), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("player_1_id", sa.Uuid(), nullable=False),
        sa.Column("player_2_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["player_1_id"], ["players.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["player_2_id"], ["players.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tournament_id", "seed", name="uq_tournament_entries_tournament_id_seed"),
    )


def downgrade() -> None:
    op.drop_table("tournament_entries")
    op.drop_table("tournaments")
