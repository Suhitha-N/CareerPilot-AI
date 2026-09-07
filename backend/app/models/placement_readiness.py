from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class PlacementReadiness(Base):
    __tablename__ = "placement_readiness"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    overall_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    resume_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    job_match_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    interview_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    coding_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    skill_progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    readiness_level: Mapped[str] = mapped_column(
        String(50),
        default="Getting Started",
        nullable=False,
    )

    strengths: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    recommendations: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )