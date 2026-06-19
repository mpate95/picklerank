"""Link matches to tournaments.

Revision ID: 0009_link_matches_to_tournaments
Revises: 0008_add_tournament_nodes
Create Date: 2026-06-19 11:15:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_link_matches_to_tournaments"
down_revision: str | None = "0008_add_tournament_nodes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("tournament_id", sa.Uuid(), nullable=True))
    op.add_column("matches", sa.Column("tournament_node_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_matches_tournament_id_tournaments",
        "matches",
        "tournaments",
        ["tournament_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_matches_tournament_node_id_tournament_nodes",
        "matches",
        "tournament_nodes",
        ["tournament_node_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_matches_tournament_node_id_tournament_nodes", "matches", type_="foreignkey")
    op.drop_constraint("fk_matches_tournament_id_tournaments", "matches", type_="foreignkey")
    op.drop_column("matches", "tournament_node_id")
    op.drop_column("matches", "tournament_id")
