from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user

from backend.app.models.career_roadmap import CareerRoadmap
from backend.app.models.job_description import JobDescription
from backend.app.models.placement_readiness import PlacementReadiness
from backend.app.models.resume import Resume
from backend.app.models.resume_profile import ResumeProfile
from backend.app.models.user import User

from backend.app.services.job_matcher import calculate_job_match
from backend.app.services.skill_gap_analyzer import analyze_skill_gaps
from backend.app.services.roadmap_generator import generate_roadmap


router = APIRouter(
    prefix="/api/career-roadmap",
    tags=["Career Roadmap"],
)


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class CareerRoadmapRequest(BaseModel):
    target_role: str
    company_name: str | None = None
    duration_weeks: int = 4
    missing_skills: list[str] = []


class RoadmapTaskUpdate(BaseModel):
    week: int
    task_index: int
    completed: bool


# =========================================================
# HELPERS
# =========================================================

def extract_resume_skills(
    profile: ResumeProfile | None,
) -> list[str]:
    if profile is None or profile.skills is None:
        return []

    skills = profile.skills
    result: list[str] = []

    if isinstance(skills, list):
        for skill in skills:
            if isinstance(skill, str) and skill.strip():
                result.append(skill.strip())

    elif isinstance(skills, dict):
        for key, value in skills.items():

            if isinstance(value, list):
                for skill in value:
                    if isinstance(skill, str) and skill.strip():
                        result.append(skill.strip())

            elif isinstance(value, str) and value.strip():
                result.append(value.strip())

            elif isinstance(key, str) and key.strip():
                result.append(key.strip())

    return list(dict.fromkeys(result))


def calculate_overall_progress(
    roadmap_data: list,
    completed_tasks: dict,
) -> int:
    total_tasks = 0
    completed_count = 0

    for week_data in roadmap_data:

        if not isinstance(week_data, dict):
            continue

        tasks = week_data.get("tasks", [])

        if not isinstance(tasks, list):
            continue

        total_tasks += len(tasks)

        week_number = week_data.get("week")

        for task_index in range(len(tasks)):
            key = f"{week_number}-{task_index}"

            if completed_tasks.get(key) is True:
                completed_count += 1

    if total_tasks == 0:
        return 0

    return round(
        (completed_count / total_tasks) * 100
    )


# =========================================================
# GENERATE CAREER ROADMAP
# =========================================================

@router.post("/generate")
def generate_career_roadmap(
    payload: CareerRoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -----------------------------------------------------
    # Get latest resume
    # -----------------------------------------------------

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id == current_user.id
        )
        .order_by(
            Resume.created_at.desc()
        )
    )

    if resume is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload your resume "
                "before generating a roadmap."
            ),
        )

    # -----------------------------------------------------
    # Get resume profile
    # -----------------------------------------------------

    profile = db.scalar(
        select(ResumeProfile)
        .where(
            ResumeProfile.resume_id == resume.id
        )
    )

    resume_profile_data = {
        "skills": profile.skills if profile else {},
        "projects": profile.projects if profile else [],
        "experience": profile.experience if profile else [],
        "education": profile.education if profile else None,
        "certifications": (
            profile.certifications
            if profile
            else None
        ),
    }

    # -----------------------------------------------------
    # Get latest job description
    # -----------------------------------------------------

    job_description = db.scalar(
        select(JobDescription)
        .where(
            JobDescription.user_id == current_user.id
        )
        .order_by(
            JobDescription.created_at.desc()
        )
    )

    if job_description is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please add a job description "
                "before generating a roadmap."
            ),
        )

    # -----------------------------------------------------
    # Prepare job analysis data
    # -----------------------------------------------------

    jd_analysis = {
        "required_skills": (
            job_description.required_skills or []
        ),
        "preferred_skills": (
            job_description.preferred_skills or []
        ),
        "experience_requirements": (
            job_description.experience_requirements
        ),
        "education_requirements": (
            job_description.education_requirements
        ),
        "keywords": (
            job_description.keywords or []
        ),
    }

    # -----------------------------------------------------
    # 1. SINGLE SOURCE OF TRUTH:
    #    Resume → Job Match
    # -----------------------------------------------------

    match_result = calculate_job_match(
        resume_profile_data,
        jd_analysis,
    )

    # -----------------------------------------------------
    # 2. Job Match → Skill Gap
    # -----------------------------------------------------

    skill_gap_result = analyze_skill_gaps(
        match_result
    )

    # -----------------------------------------------------
    # 3. Get missing skills from Skill Gap Analyzer
    # -----------------------------------------------------

    calculated_missing_skills = [
        gap["skill"]
        for gap in skill_gap_result.get(
            "skill_gaps",
            [],
        )
        if isinstance(gap, dict)
        and isinstance(gap.get("skill"), str)
    ]

    # -----------------------------------------------------
    # Optional manual override
    #
    # Existing frontend can still supply missing_skills.
    # If not supplied, use the official skill-gap result.
    # -----------------------------------------------------

    if payload.missing_skills:
        missing_skills = list(
            dict.fromkeys(
                payload.missing_skills
            )
        )
    else:
        missing_skills = list(
            dict.fromkeys(
                calculated_missing_skills
            )
        )

    # -----------------------------------------------------
    # 4. Get readiness score
    # -----------------------------------------------------

    readiness = db.scalar(
        select(PlacementReadiness)
        .where(
            PlacementReadiness.user_id
            == current_user.id
        )
    )

    readiness_score = (
        readiness.overall_score
        if readiness
        else 0
    )

    # -----------------------------------------------------
    # 5. Generate personalized roadmap
    # -----------------------------------------------------

    roadmap_data = generate_roadmap(
        missing_skills=missing_skills,
        duration_weeks=payload.duration_weeks,
        readiness_score=readiness_score,
    )

    # -----------------------------------------------------
    # 6. Find existing roadmap
    # -----------------------------------------------------

    roadmap = db.scalar(
        select(CareerRoadmap)
        .where(
            CareerRoadmap.user_id
            == current_user.id
        )
        .order_by(
            CareerRoadmap.updated_at.desc()
        )
    )

    # -----------------------------------------------------
    # 7. Create or update roadmap
    # -----------------------------------------------------

    if roadmap is None:

        roadmap = CareerRoadmap(
            user_id=current_user.id,
            job_description_id=job_description.id,
            target_role=payload.target_role,
            company_name=payload.company_name,
            duration_weeks=payload.duration_weeks,
            overall_progress=0,
            status="active",
            roadmap_data=roadmap_data,
            completed_tasks={},
        )

        db.add(roadmap)

    else:

        roadmap.job_description_id = (
            job_description.id
        )

        roadmap.target_role = (
            payload.target_role
        )

        roadmap.company_name = (
            payload.company_name
        )

        roadmap.duration_weeks = (
            payload.duration_weeks
        )

        roadmap.roadmap_data = (
            roadmap_data
        )

        roadmap.status = "active"

        # Regenerating creates a fresh roadmap.
        roadmap.completed_tasks = {}
        roadmap.overall_progress = 0

        roadmap.updated_at = (
            datetime.now(timezone.utc)
        )

    db.commit()
    db.refresh(roadmap)

    # -----------------------------------------------------
    # 8. Return complete intelligence chain
    # -----------------------------------------------------

    return {
        "id": roadmap.id,
        "target_role": roadmap.target_role,
        "company_name": roadmap.company_name,
        "duration_weeks": roadmap.duration_weeks,
        "overall_progress": roadmap.overall_progress,
        "status": roadmap.status,

        "missing_skills": missing_skills,

        "skill_gap_analysis": {
            "total_gaps": skill_gap_result.get(
                "total_gaps",
                0,
            ),
            "critical_gap_count": skill_gap_result.get(
                "critical_gap_count",
                0,
            ),
            "important_gap_count": skill_gap_result.get(
                "important_gap_count",
                0,
            ),
            "optional_gap_count": skill_gap_result.get(
                "optional_gap_count",
                0,
            ),
            "summary": skill_gap_result.get(
                "summary",
                "",
            ),
        },

        "match": {
            "score": match_result.get(
                "match_score",
                match_result.get("score", 0),
            ),
        },

        "roadmap": roadmap.roadmap_data or [],

        "completed_tasks": (
            roadmap.completed_tasks or {}
        ),
    }


# =========================================================
# GET CURRENT CAREER ROADMAP
# =========================================================

@router.get("")
def get_career_roadmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    roadmap = db.scalar(
        select(CareerRoadmap)
        .where(
            CareerRoadmap.user_id
            == current_user.id
        )
        .order_by(
            CareerRoadmap.updated_at.desc()
        )
    )

    if roadmap is None:
        raise HTTPException(
            status_code=404,
            detail="Career roadmap not found",
        )

    roadmap_data = (
        roadmap.roadmap_data
        if isinstance(
            roadmap.roadmap_data,
            list,
        )
        else []
    )

    completed_tasks = (
        roadmap.completed_tasks
        if isinstance(
            roadmap.completed_tasks,
            dict,
        )
        else {}
    )

    # -----------------------------------------------------
    # Derive missing skills from saved roadmap
    # -----------------------------------------------------

    missing_skills = []

    for week in roadmap_data:

        if not isinstance(week, dict):
            continue

        skills = week.get("skills", [])

        if not isinstance(skills, list):
            continue

        for skill in skills:

            if (
                isinstance(skill, str)
                and skill not in missing_skills
            ):
                missing_skills.append(skill)

    return {
        "id": roadmap.id,
        "target_role": roadmap.target_role,
        "company_name": roadmap.company_name,
        "duration_weeks": roadmap.duration_weeks,
        "overall_progress": roadmap.overall_progress,
        "status": roadmap.status,
        "missing_skills": missing_skills,
        "roadmap": roadmap_data,
        "completed_tasks": completed_tasks,
    }


# =========================================================
# UPDATE ROADMAP TASK
# =========================================================

@router.put("/tasks")
def update_roadmap_task(
    payload: RoadmapTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    roadmap = db.scalar(
        select(CareerRoadmap)
        .where(
            CareerRoadmap.user_id
            == current_user.id
        )
        .order_by(
            CareerRoadmap.updated_at.desc()
        )
    )

    if roadmap is None:
        raise HTTPException(
            status_code=404,
            detail="Career roadmap not found",
        )

    roadmap_data = (
        roadmap.roadmap_data
        if isinstance(
            roadmap.roadmap_data,
            list,
        )
        else []
    )

    # -----------------------------------------------------
    # Find selected week
    # -----------------------------------------------------

    selected_week = None

    for week_data in roadmap_data:

        if not isinstance(
            week_data,
            dict,
        ):
            continue

        stored_week = week_data.get("week")

        try:
            stored_week_number = int(
                stored_week
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        if (
            stored_week_number
            == payload.week
        ):
            selected_week = week_data
            break

    if selected_week is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid roadmap week",
        )

    # -----------------------------------------------------
    # Validate task
    # -----------------------------------------------------

    tasks = selected_week.get(
        "tasks",
        [],
    )

    if not isinstance(tasks, list):
        raise HTTPException(
            status_code=400,
            detail="Invalid roadmap tasks",
        )

    if (
        payload.task_index < 0
        or payload.task_index >= len(tasks)
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid task index",
        )

    # -----------------------------------------------------
    # Get existing completion data
    # -----------------------------------------------------

    completed_tasks = (
        roadmap.completed_tasks
        if isinstance(
            roadmap.completed_tasks,
            dict,
        )
        else {}
    )

    # New dict ensures SQLAlchemy detects JSON change.
    completed_tasks = dict(
        completed_tasks
    )

    task_key = (
        f"{payload.week}-"
        f"{payload.task_index}"
    )

    completed_tasks[task_key] = (
        payload.completed
    )

    roadmap.completed_tasks = (
        completed_tasks
    )

    # -----------------------------------------------------
    # Calculate progress
    # -----------------------------------------------------

    overall_progress = (
        calculate_overall_progress(
            roadmap_data,
            completed_tasks,
        )
    )

    roadmap.overall_progress = (
        overall_progress
    )

    # -----------------------------------------------------
    # Update status
    # -----------------------------------------------------

    roadmap.status = (
        "completed"
        if overall_progress >= 100
        else "active"
    )

    roadmap.updated_at = (
        datetime.now(timezone.utc)
    )

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    db.commit()
    db.refresh(roadmap)

    return {
        "message": "Task progress saved",
        "week": payload.week,
        "task_index": payload.task_index,
        "completed": payload.completed,
        "overall_progress": (
            roadmap.overall_progress
        ),
        "status": roadmap.status,
        "completed_tasks": (
            roadmap.completed_tasks or {}
        ),
    }