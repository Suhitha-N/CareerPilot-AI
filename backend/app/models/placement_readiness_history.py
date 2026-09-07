from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class PlacementReadinessHistory(Base):
    __tablename__ = "placement_readiness_history"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    overall_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    resume_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    job_match_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    interview_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    coding_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    skill_progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    readiness_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Getting Started",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )