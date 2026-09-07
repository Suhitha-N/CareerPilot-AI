from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class ResumeProfile(Base):
    __tablename__ = "resume_profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    summary: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )

    skills: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    projects: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    experience: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    education: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )

    certifications: Mapped[str | None] = mapped_column(
        JSON,
        nullable=True,
    )

    achievements: Mapped[str | None] = mapped_column(
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