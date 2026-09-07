"""create resumes table

Revision ID: 0346bf1fbf6c
Revises: 43642815f256
Create Date: 2026-09-02 12:05:49.588089

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0346bf1fbf6c"
down_revision: Union[str, Sequence[str], None] = "43642815f256"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create resumes table."""
    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("file_type", sa.String(length=20), nullable=False),
        sa.Column("parsed_text", sa.Text(), nullable=True),
        sa.Column("ats_score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_resumes_id"),
        "resumes",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_resumes_user_id"),
        "resumes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop resumes table."""
    op.drop_index(op.f("ix_resumes_user_id"), table_name="resumes")
    op.drop_index(op.f("ix_resumes_id"), table_name="resumes")
    op.drop_table("resumes")