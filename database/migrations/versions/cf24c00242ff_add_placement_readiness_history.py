"""add placement readiness history

Revision ID: cf24c00242ff
Revises: 46fc67fb2d61
Create Date: 2026-09-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cf24c00242ff"
down_revision: Union[str, Sequence[str], None] = "46fc67fb2d61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "placement_readiness_history",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            index=True,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),

        sa.Column(
            "overall_score",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "resume_score",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "job_match_score",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "interview_score",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "coding_score",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "skill_progress",
            sa.Integer(),
            nullable=False,
            default=0,
        ),

        sa.Column(
            "readiness_level",
            sa.String(50),
            nullable=False,
            default="Getting Started",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("placement_readiness_history")