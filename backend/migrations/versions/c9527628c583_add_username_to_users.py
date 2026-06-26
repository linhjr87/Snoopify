"""add username to users

Revision ID: c9527628c583
Revises: 0bddbd794ada
Create Date: 2026-06-27 02:31:03.506472
"""
from alembic import op
import sqlalchemy as sa


revision = 'c9527628c583'
down_revision = '0bddbd794ada'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(), nullable=True))
    # Backfill existing rows from the email local-part, lowercased. Emails are
    # already unique; the few existing dev/seed rows have distinct, simple
    # local-parts, so this satisfies the unique index added below.
    op.execute("UPDATE users SET username = lower(split_part(email, '@', 1)) WHERE username IS NULL")
    op.alter_column("users", "username", nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", "users")
    op.drop_column("users", "username")
