"""add payment_methods table

Revision ID: 002
Revises: 001
Create Date: 2026-08-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── payment_methods ───────────────────────────────────────────────────
    op.create_table(
        "payment_methods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("brand", sa.String(20), nullable=False),
        sa.Column("last4", sa.String(4), nullable=False),
        sa.Column("expiry", sa.String(5), nullable=False),
        sa.Column("holder_name", sa.String(200), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_payment_methods_user_id", "payment_methods", ["user_id"])


def downgrade() -> None:
    op.drop_table("payment_methods")
