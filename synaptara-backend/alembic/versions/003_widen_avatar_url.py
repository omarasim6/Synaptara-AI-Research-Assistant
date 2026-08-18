"""widen users.avatar_url to text

Revision ID: 003
Revises: 002
Create Date: 2026-08-09

Profile picture uploads are stored as compressed base64 data URLs (see
app/schemas/user.py for the size cap enforced at the API layer), which
comfortably exceed the original String(500) column used for
Google-provided avatar links.
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "avatar_url",
        existing_type=sa.String(500),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "avatar_url",
        existing_type=sa.Text(),
        type_=sa.String(500),
        existing_nullable=True,
    )
