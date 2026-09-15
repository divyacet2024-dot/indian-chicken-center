"""Add user language preference and order delivery scheduling.

Revision ID: b72d4e2f6a11
Revises: a516fe8a6f0a
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b72d4e2f6a11"
down_revision: Union[str, None] = "a516fe8a6f0a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("preferred_language", sa.String(length=2), nullable=False, server_default="en"))
    op.add_column("orders", sa.Column("requested_delivery_time", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("delivery_status", sa.String(length=50), nullable=False, server_default="pending"))


def downgrade() -> None:
    op.drop_column("orders", "delivery_status")
    op.drop_column("orders", "requested_delivery_time")
    op.drop_column("users", "preferred_language")