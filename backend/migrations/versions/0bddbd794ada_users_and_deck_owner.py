"""users and deck owner

Revision ID: 0bddbd794ada
Revises: 8d963e2f57dd
Create Date: 2026-06-25 09:02:09.186724
"""
from alembic import op
import sqlalchemy as sa


revision = '0bddbd794ada'
down_revision = '8d963e2f57dd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    # Existing dev decks are unowned — drop them (cascade removes cards + review_logs).
    op.execute("DELETE FROM decks")
    op.add_column("decks", sa.Column("user_id", sa.UUID(), nullable=False))
    op.create_index("ix_decks_user_id", "decks", ["user_id"])
    op.create_foreign_key("fk_decks_user_id", "decks", "users", ["user_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("fk_decks_user_id", "decks", type_="foreignkey")
    op.drop_index("ix_decks_user_id", "decks")
    op.drop_column("decks", "user_id")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
