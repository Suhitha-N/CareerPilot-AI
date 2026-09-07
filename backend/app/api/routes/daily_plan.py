from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.daily_plan import DailyPlanTask
from backend.app.models.user import User


router = APIRouter(
    prefix="/api/daily-plan",
    tags=["Daily Plan"],
)


class DailyPlanTaskCreate(BaseModel):
    task_index: int = Field(ge=0)
    task_text: str = Field(min_length=1, max_length=2000)
    duration: str = Field(min_length=1, max_length=50)


class DailyPlanTaskUpdate(BaseModel):
    completed: bool


class DailyPlanTaskResponse(BaseModel):
    id: int
    plan_date: date
    task_index: int
    task_text: str
    duration: str
    completed: bool

    class Config:
        from_attributes = True


class DailyPlanResponse(BaseModel):
    date: date
    tasks: list[DailyPlanTaskResponse]
    total_tasks: int
    completed_tasks: int
    progress: int


def get_today_tasks(
    db: Session,
    user_id: int,
) -> list[DailyPlanTask]:

    today = date.today()

    result = db.execute(
        select(DailyPlanTask)
        .where(
            DailyPlanTask.user_id == user_id,
            DailyPlanTask.plan_date == today,
        )
        .order_by(DailyPlanTask.task_index)
    )

    return list(result.scalars().all())


def calculate_progress(
    tasks: list[DailyPlanTask],
) -> int:

    if not tasks:
        return 0

    completed = sum(
        1 for task in tasks
        if task.completed
    )

    return round(
        (completed / len(tasks)) * 100
    )


@router.get(
    "",
    response_model=DailyPlanResponse,
)
def get_daily_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    tasks = get_today_tasks(
        db,
        current_user.id,
    )

    completed_tasks = sum(
        1 for task in tasks
        if task.completed
    )

    return {
        "date": date.today(),
        "tasks": tasks,
        "total_tasks": len(tasks),
        "completed_tasks": completed_tasks,
        "progress": calculate_progress(tasks),
    }


@router.post(
    "",
    response_model=DailyPlanResponse,
)
def create_daily_plan(
    tasks: list[DailyPlanTaskCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not tasks:
        raise HTTPException(
            status_code=400,
            detail="Daily plan must contain at least one task.",
        )

    today = date.today()

    existing_tasks = get_today_tasks(
        db,
        current_user.id,
    )

    for existing in existing_tasks:
        db.delete(existing)

    db.flush()

    new_tasks = []

    for task_data in tasks:

        task = DailyPlanTask(
            user_id=current_user.id,
            plan_date=today,
            task_index=task_data.task_index,
            task_text=task_data.task_text,
            duration=task_data.duration,
            completed=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(task)
        new_tasks.append(task)

    db.commit()

    for task in new_tasks:
        db.refresh(task)

    completed_tasks = sum(
        1 for task in new_tasks
        if task.completed
    )

    return {
        "date": today,
        "tasks": new_tasks,
        "total_tasks": len(new_tasks),
        "completed_tasks": completed_tasks,
        "progress": calculate_progress(new_tasks),
    }


@router.put(
    "/tasks/{task_id}",
    response_model=DailyPlanTaskResponse,
)
def update_daily_plan_task(
    task_id: int,
    task_data: DailyPlanTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    result = db.execute(
        select(DailyPlanTask)
        .where(
            DailyPlanTask.id == task_id,
            DailyPlanTask.user_id == current_user.id,
        )
    )

    task = result.scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Daily plan task not found.",
        )

    task.completed = task_data.completed
    task.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)

    return task