"""Initial backend setup.

Revision ID: 0001_initial_setup
Revises:
Create Date: 2026-05-25 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_setup"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Intentionally empty. Domain tables will be added in later phases.
    pass


def downgrade() -> None:
    pass
