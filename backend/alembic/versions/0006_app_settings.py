"""Add application settings table.

Revision ID: 0006_app_settings
Revises: 0005_session_state
Create Date: 2026-06-18 12:00:00.000000
"""

from collections.abc import Sequence
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_app_settings"
down_revision: str | None = "0005_session_state"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("leaderboard_qualifier_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("leaderboard_qualifier_min_games", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.bulk_insert(
        sa.table(
            "app_settings",
            sa.column("id", sa.Integer()),
            sa.column("leaderboard_qualifier_enabled", sa.Boolean()),
            sa.column("leaderboard_qualifier_min_games", sa.Integer()),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
        ),
        [
            {
                "id": 1,
                "leaderboard_qualifier_enabled": False,
                "leaderboard_qualifier_min_games": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("app_settings")
