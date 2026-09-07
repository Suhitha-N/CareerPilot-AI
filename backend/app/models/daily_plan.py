from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class DailyPlanTask(Base):
    __tablename__ = "daily_plan_tasks"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "plan_date",
            "task_index",
            name="uq_daily_plan_user_date_task",
        ),
    )

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

    plan_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    task_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    task_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    duration: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
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