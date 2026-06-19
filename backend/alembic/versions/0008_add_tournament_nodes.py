"""Add tournament bracket nodes.

Revision ID: 0008_add_tournament_nodes
Revises: 0007_add_tournaments
Create Date: 2026-06-19 10:15:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_add_tournament_nodes"
down_revision: str | None = "0007_add_tournaments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tournament_nodes",
        sa.Column("tournament_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("bracket", sa.String(), nullable=False),
        sa.Column("round_number", sa.Integer(), nullable=False),
        sa.Column("slot_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("team_1_entry_id", sa.Uuid(), nullable=True),
        sa.Column("team_2_entry_id", sa.Uuid(), nullable=True),
        sa.Column("team_1_source_node_id", sa.Uuid(), nullable=True),
        sa.Column("team_1_source_kind", sa.String(), nullable=True),
        sa.Column("team_2_source_node_id", sa.Uuid(), nullable=True),
        sa.Column("team_2_source_kind", sa.String(), nullable=True),
        sa.Column("winner_entry_id", sa.Uuid(), nullable=True),
        sa.Column("loser_entry_id", sa.Uuid(), nullable=True),
        sa.Column("team_1_score", sa.Integer(), nullable=True),
        sa.Column("team_2_score", sa.Integer(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["loser_entry_id"], ["tournament_entries.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_1_entry_id"], ["tournament_entries.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_1_source_node_id"], ["tournament_nodes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_2_entry_id"], ["tournament_entries.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["team_2_source_node_id"], ["tournament_nodes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["winner_entry_id"], ["tournament_entries.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tournament_id", "bracket", "round_number", "slot_number", name="uq_tournament_nodes_bracket_round_slot"),
        sa.UniqueConstraint("tournament_id", "sequence", name="uq_tournament_nodes_tournament_id_sequence"),
    )


def downgrade() -> None:
    op.drop_table("tournament_nodes")
