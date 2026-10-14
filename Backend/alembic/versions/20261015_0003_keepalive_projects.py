"""Add user-managed Render keep-alive projects.

Revision ID: 20261015_0003
Revises: 20261014_0002
Create Date: 2026-10-15
"""

import sqlalchemy as sa
from alembic import context, op

revision = "20261015_0003"
down_revision = "20261014_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if not context.is_offline_mode() and sa.inspect(bind).has_table("keepalive_projects"):
        return
    op.create_table(
        "keepalive_projects",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_ping_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status_code", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.String(length=300), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "url", name="uq_keepalive_project_user_url"),
    )
    op.create_index(
        "ix_keepalive_projects_user_id", "keepalive_projects", ["user_id"], unique=False
    )
    op.create_index(
        "ix_keepalive_projects_enabled", "keepalive_projects", ["enabled"], unique=False
    )
    op.create_index(
        "ix_keepalive_projects_enabled_updated",
        "keepalive_projects",
        ["enabled", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if not context.is_offline_mode() and not sa.inspect(bind).has_table("keepalive_projects"):
        return
    op.drop_index("ix_keepalive_projects_enabled_updated", table_name="keepalive_projects")
    op.drop_index("ix_keepalive_projects_enabled", table_name="keepalive_projects")
    op.drop_index("ix_keepalive_projects_user_id", table_name="keepalive_projects")
    op.drop_table("keepalive_projects")
