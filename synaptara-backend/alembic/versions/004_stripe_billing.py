"""add stripe billing support

Revision ID: 004
Revises: 003
Create Date: 2026-08-11

Adds:
  - users.stripe_customer_id            → links a user to their Stripe Customer
  - payment_methods.stripe_payment_method_id → the pm_... id needed to charge
    a saved card again (the table already only stores PCI-safe display data;
    this just adds the processor reference alongside it)
  - subscriptions table                 → one row per checkout / plan change,
    used for order history and to make Stripe webhook handling idempotent
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])

    op.add_column(
        "payment_methods",
        sa.Column("stripe_payment_method_id", sa.String(255), nullable=True),
    )
    op.create_index(
        "ix_payment_methods_stripe_pm_id", "payment_methods", ["stripe_payment_method_id"]
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("amount_pkr", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index(
        "ix_subscriptions_stripe_pi_id", "subscriptions", ["stripe_payment_intent_id"], unique=True
    )


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_index("ix_payment_methods_stripe_pm_id", table_name="payment_methods")
    op.drop_column("payment_methods", "stripe_payment_method_id")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "stripe_customer_id")
