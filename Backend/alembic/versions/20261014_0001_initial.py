"""Initial durable Interview Mentor schema.

Revision ID: 20261014_0001
Revises:
Create Date: 2026-10-14
"""

from alembic import op

from app.db.base import Base
from app.models import entities  # noqa: F401

revision = "20261014_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
