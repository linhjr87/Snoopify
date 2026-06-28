"""add profile fields

Revision ID: cdd7dfbfe05d
Revises: c9527628c583
Create Date: 2026-06-27 13:42:24.836097
"""
from alembic import op
import sqlalchemy as sa


revision = 'cdd7dfbfe05d'
down_revision = 'c9527628c583'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("level", sa.String(), nullable=False, server_default="B1"))
    op.add_column("users", sa.Column("level_target", sa.String(), nullable=False, server_default="B2"))
    op.add_column("users", sa.Column("goal_text", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("daily_target", sa.Integer(), nullable=False, server_default="20"))


def downgrade() -> None:
    op.drop_column("users", "daily_target")
    op.drop_column("users", "goal_text")
    op.drop_column("users", "level_target")
    op.drop_column("users", "level")
