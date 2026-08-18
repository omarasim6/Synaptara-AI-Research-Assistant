"""add notification preferences to users

Revision ID: 006
Revises: 005
Create Date: 2026-08-16

Adds:
  - users.email_alerts_enabled          (bool, default False)
  - users.weekly_digest_enabled         (bool, default False)
  - users.weekly_digest_last_sent_period (varchar, nullable) — idempotency
    key for the weekly digest scheduler (ISO week, e.g. "2026-W33").
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("weekly_digest_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("weekly_digest_last_sent_period", sa.String(10), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "weekly_digest_last_sent_period")
    op.drop_column("users", "weekly_digest_enabled")
    op.drop_column("users", "email_alerts_enabled")
