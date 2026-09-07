from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class CodingProblem(Base):
    __tablename__ = "coding_problems"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    difficulty: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    input_format: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    output_format: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    constraints: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    examples: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    starter_code: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    test_cases: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )