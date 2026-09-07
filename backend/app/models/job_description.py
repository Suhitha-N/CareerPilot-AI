from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

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

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    description_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    required_skills: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    preferred_skills: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    experience_requirements: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    education_requirements: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    keywords: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )