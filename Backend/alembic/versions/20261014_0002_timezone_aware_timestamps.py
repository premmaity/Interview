"""Make shared audit timestamps timezone-aware.

Revision ID: 20261014_0002
Revises: 20261014_0001
Create Date: 2026-10-14
"""

import sqlalchemy as sa

from alembic import context, op

revision = "20261014_0002"
down_revision = "20261014_0001"
branch_labels = None
depends_on = None


TIMESTAMP_COLUMNS = (
    ("users", "created_at"),
    ("users", "updated_at"),
    ("candidate_profiles", "created_at"),
    ("candidate_profiles", "updated_at"),
    ("interview_templates", "created_at"),
    ("interview_templates", "updated_at"),
    ("interview_sessions", "created_at"),
    ("interview_sessions", "updated_at"),
    ("interview_questions", "created_at"),
    ("interview_questions", "updated_at"),
    ("interview_answers", "created_at"),
    ("interview_answers", "updated_at"),
    ("evaluations", "created_at"),
    ("evaluations", "updated_at"),
    ("quiz_attempts", "created_at"),
    ("quiz_attempts", "updated_at"),
    ("quiz_answers", "created_at"),
    ("quiz_answers", "updated_at"),
)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    columns_to_upgrade = TIMESTAMP_COLUMNS
    if not context.is_offline_mode():
        inspector = sa.inspect(bind)
        columns_to_upgrade = tuple(
            (table_name, column_name)
            for table_name, column_name in TIMESTAMP_COLUMNS
            if not next(
                column["type"]
                for column in inspector.get_columns(table_name)
                if column["name"] == column_name
            ).timezone
        )

    for table_name, column_name in columns_to_upgrade:
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.DateTime(timezone=False),
            type_=sa.DateTime(timezone=True),
            existing_nullable=False,
            postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    for table_name, column_name in reversed(TIMESTAMP_COLUMNS):
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(timezone=False),
            existing_nullable=False,
            postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
        )
