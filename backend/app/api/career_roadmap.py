from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user

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

    duration_weeks: int = Field(
        default=4,
        ge=1,
        le=12,
    )

    missing_skills: list[str] = Field(
        default_factory=list
    )


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
    """
    Extract resume skills safely from the stored profile.
    Supports both list and dictionary formats.
    """

    if profile is None or profile.skills is None:
        return []

    skills = profile.skills
    result: list[str] = []

    if isinstance(skills, list):

        for skill in skills:

            if (
                isinstance(skill, str)
                and skill.strip()
            ):
                result.append(
                    skill.strip()
                )

    elif isinstance(skills, dict):

        for key, value in skills.items():

            if isinstance(value, list):

                for skill in value:

                    if (
                        isinstance(skill, str)
                        and skill.strip()
                    ):
                        result.append(
                            skill.strip()
                        )

            elif (
                isinstance(value, str)
                and value.strip()
            ):
                result.append(
                    value.strip()
                )

            elif (
                isinstance(key, str)
                and key.strip()
            ):
                result.append(
                    key.strip()
                )

    return list(
        dict.fromkeys(result)
    )


def calculate_overall_progress(
    roadmap_data: list,
    completed_tasks: dict,
) -> int:
    """
    Calculate overall roadmap completion
    based on completed learning tasks.
    """

    total_tasks = 0
    completed_count = 0

    for week_data in roadmap_data:

        if not isinstance(
            week_data,
            dict,
        ):
            continue

        tasks = week_data.get(
            "tasks",
            [],
        )

        if not isinstance(
            tasks,
            list,
        ):
            continue

        total_tasks += len(tasks)

        week_number = week_data.get(
            "week"
        )

        for task_index in range(
            len(tasks)
        ):

            key = (
                f"{week_number}-"
                f"{task_index}"
            )

            if (
                completed_tasks.get(key)
                is True
            ):
                completed_count += 1

    if total_tasks == 0:
        return 0

    return round(
        (
            completed_count
            / total_tasks
        )
        * 100
    )


def convert_roadmap_to_weeks(
    generated_roadmap: list,
    duration_weeks: int,
) -> list[dict[str, Any]]:
    """
    Convert the roadmap generator's skill-based
    output into the weekly structure expected
    by the Career Roadmap frontend.

    The user's selected duration is respected.

    Example:

        5 skills + 4 weeks

        Week 1 -> 2 skills
        Week 2 -> 1 skill
        Week 3 -> 1 skill
        Week 4 -> 1 skill

    All identified skills are preserved.
    """

    if not generated_roadmap:
        return []

    # Keep duration within the supported range.
    duration_weeks = max(
        1,
        min(
            int(duration_weeks),
            12,
        ),
    )

    # Keep only valid roadmap items.
    valid_items = [
        item
        for item in generated_roadmap
        if isinstance(item, dict)
    ]

    if not valid_items:
        return []

    # We cannot create more weeks than
    # there are roadmap items.
    actual_weeks = min(
        duration_weeks,
        len(valid_items),
    )

    total_items = len(valid_items)

    # Distribute all skills as evenly as possible.
    #
    # Example:
    # 5 skills / 4 weeks
    #
    # base = 1
    # extra = 1
    #
    # Week 1 -> 2
    # Week 2 -> 1
    # Week 3 -> 1
    # Week 4 -> 1

    base_items_per_week = (
        total_items
        // actual_weeks
    )

    extra_items = (
        total_items
        % actual_weeks
    )

    roadmap_data: list[
        dict[str, Any]
    ] = []

    current_index = 0

    for week_number in range(
        1,
        actual_weeks + 1,
    ):

        items_this_week = (
            base_items_per_week
            + (
                1
                if week_number
                <= extra_items
                else 0
            )
        )

        week_items = valid_items[
            current_index:
            current_index
            + items_this_week
        ]

        current_index += (
            items_this_week
        )

        if not week_items:
            continue

        skills: list[str] = []
        tasks: list[str] = []
        projects: list[str] = []
        milestones: list[str] = []

        priorities: list[str] = []
        categories: list[str] = []
        titles: list[str] = []

        # -------------------------------------------------
        # Combine all generated information
        # belonging to this week.
        # -------------------------------------------------

        for item in week_items:

            skill = item.get(
                "skill",
                "Skill Development",
            )

            priority = item.get(
                "priority",
                "medium",
            )

            category = item.get(
                "category",
                "important",
            )

            title = item.get(
                "title",
                f"{skill} Skill Development",
            )

            topics = item.get(
                "topics",
                [],
            )

            if not isinstance(
                topics,
                list,
            ):
                topics = []

            # Add learning topics.
            for topic in topics:

                if (
                    isinstance(
                        topic,
                        str,
                    )
                    and topic.strip()
                ):
                    tasks.append(
                        topic.strip()
                    )

            # Add skill.
            if (
                isinstance(
                    skill,
                    str,
                )
                and skill.strip()
            ):
                skill_name = (
                    skill.strip()
                )

                if (
                    skill_name
                    not in skills
                ):
                    skills.append(
                        skill_name
                    )

            # Add title.
            if (
                isinstance(
                    title,
                    str,
                )
                and title.strip()
            ):
                titles.append(
                    title.strip()
                )

            # Add priority.
            if (
                isinstance(
                    priority,
                    str,
                )
                and priority.strip()
            ):
                priorities.append(
                    priority.strip().lower()
                )

            # Add category.
            if (
                isinstance(
                    category,
                    str,
                )
                and category.strip()
            ):
                categories.append(
                    category.strip().lower()
                )

            # Add project.
            project = item.get(
                "project",
                "",
            )

            if (
                isinstance(
                    project,
                    str,
                )
                and project.strip()
            ):
                projects.append(
                    project.strip()
                )

            # Add milestone.
            milestone = item.get(
                "milestone",
                "",
            )

            if (
                isinstance(
                    milestone,
                    str,
                )
                and milestone.strip()
            ):
                milestones.append(
                    milestone.strip()
                )

        # -------------------------------------------------
        # Determine weekly priority.
        # -------------------------------------------------

        if "high" in priorities:
            week_priority = "high"

        elif "medium" in priorities:
            week_priority = "medium"

        else:
            week_priority = "low"

        # -------------------------------------------------
        # Determine weekly category.
        # -------------------------------------------------

        if "critical" in categories:
            week_category = "critical"

        elif "important" in categories:
            week_category = "important"

        else:
            week_category = "optional"

        # -------------------------------------------------
        # Determine focus.
        # -------------------------------------------------

        if len(skills) == 1:

            focus = skills[0]

        else:

            focus = " + ".join(
                skills
            )

        # -------------------------------------------------
        # Determine title.
        # -------------------------------------------------

        if len(titles) == 1:

            week_title = titles[0]

        else:

            week_title = (
                " + ".join(skills)
                + " Skill Development"
            )

        # -------------------------------------------------
        # Fallback task if generator returned none.
        # -------------------------------------------------

        if not tasks:

            for skill in skills:

                tasks.extend(
                    [
                        (
                            f"{skill} fundamentals"
                        ),
                        (
                            f"Core concepts of "
                            f"{skill}"
                        ),
                        (
                            f"Practical usage of "
                            f"{skill}"
                        ),
                        (
                            f"Common tools and "
                            f"workflows for "
                            f"{skill}"
                        ),
                        (
                            f"Best practices for "
                            f"{skill}"
                        ),
                    ]
                )

        # -------------------------------------------------
        # Build weekly project.
        # -------------------------------------------------

        project_text = " ".join(
            projects
        )

        if not project_text:

            project_text = (
                "Build a small practical "
                "project demonstrating "
                + ", ".join(skills)
                + "."
            )

        # -------------------------------------------------
        # Build weekly milestone.
        # -------------------------------------------------

        milestone_text = " ".join(
            milestones
        )

        if not milestone_text:

            milestone_text = (
                "Complete practical "
                "exercises and demonstrate "
                "the core concepts."
            )

        # -------------------------------------------------
        # Final frontend-compatible week.
        # -------------------------------------------------

        roadmap_data.append(
            {
                "week": week_number,
                "title": week_title,
                "focus": focus,
                "priority": week_priority,
                "category": week_category,
                "skills": skills,
                "tasks": tasks,
                "project": project_text,
                "milestone": milestone_text,
                "completed": False,
            }
        )

    return roadmap_data


# =========================================================
# GENERATE CAREER ROADMAP
# =========================================================

@router.post("/generate")
def generate_career_roadmap(
    payload: CareerRoadmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    # -----------------------------------------------------
    # Get latest resume
    # -----------------------------------------------------

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id
            == current_user.id
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
            ResumeProfile.resume_id
            == resume.id
        )
    )

    resume_profile_data = {
        "skills": (
            profile.skills
            if profile
            else {}
        ),
        "projects": (
            profile.projects
            if profile
            else []
        ),
        "experience": (
            profile.experience
            if profile
            else []
        ),
        "education": (
            profile.education
            if profile
            else None
        ),
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
            JobDescription.user_id
            == current_user.id
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
    # Prepare job description analysis
    # -----------------------------------------------------

    jd_analysis = {
        "required_skills": (
            job_description.required_skills
            or []
        ),
        "preferred_skills": (
            job_description.preferred_skills
            or []
        ),
        "experience_requirements": (
            job_description
            .experience_requirements
        ),
        "education_requirements": (
            job_description
            .education_requirements
        ),
        "keywords": (
            job_description.keywords
            or []
        ),
    }

    # -----------------------------------------------------
    # 1. Resume -> Job Match
    # -----------------------------------------------------

    match_result = calculate_job_match(
        resume_profile_data,
        jd_analysis,
    )

    # -----------------------------------------------------
    # 2. Job Match -> Skill Gap
    # -----------------------------------------------------

    skill_gap_result = analyze_skill_gaps(
        match_result
    )

    # -----------------------------------------------------
    # 3. Get missing skills from Skill Gap Analyzer
    # -----------------------------------------------------

    calculated_missing_skills = []

    for gap in skill_gap_result.get(
        "skill_gaps",
        [],
    ):

        if not isinstance(
            gap,
            dict,
        ):
            continue

        skill = gap.get(
            "skill"
        )

        if (
            isinstance(
                skill,
                str,
            )
            and skill.strip()
        ):

            calculated_missing_skills.append(
                skill.strip()
            )

    calculated_missing_skills = list(
        dict.fromkeys(
            calculated_missing_skills
        )
    )

    # -----------------------------------------------------
    # Optional manual override.
    #
    # If frontend provides missing_skills,
    # use them. Otherwise use official
    # Skill Gap Analyzer result.
    # -----------------------------------------------------

    if payload.missing_skills:

        missing_skills = list(
            dict.fromkeys(
                skill.strip()
                for skill
                in payload.missing_skills
                if isinstance(
                    skill,
                    str,
                )
                and skill.strip()
            )
        )

    else:

        missing_skills = (
            calculated_missing_skills
        )

    # -----------------------------------------------------
    # 4. Get placement readiness score
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
    # 5. Generate roadmap
    #
    # IMPORTANT:
    # roadmap_generator.py expects the complete
    # skill-gap analysis dictionary.
    # -----------------------------------------------------

    roadmap_result = generate_roadmap(
        skill_gap_result
    )

    # -----------------------------------------------------
    # Extract generated roadmap list.
    # -----------------------------------------------------

    generated_roadmap = []

    if isinstance(
        roadmap_result,
        dict,
    ):

        generated_roadmap = (
            roadmap_result.get(
                "roadmap",
                [],
            )
        )

    elif isinstance(
        roadmap_result,
        list,
    ):

        generated_roadmap = (
            roadmap_result
        )

    # -----------------------------------------------------
    # Safety fallback:
    #
    # If the roadmap generator returned nothing but
    # missing skills exist, create simple roadmap items.
    # -----------------------------------------------------

    if (
        not generated_roadmap
        and missing_skills
    ):

        generated_roadmap = []

        for skill in missing_skills:

            generated_roadmap.append(
                {
                    "order": (
                        len(generated_roadmap)
                        + 1
                    ),
                    "skill": skill,
                    "category": "important",
                    "priority": "high",
                    "title": (
                        f"{skill} "
                        "Skill Development"
                    ),
                    "duration": "1-2 weeks",
                    "topics": [
                        (
                            f"{skill} fundamentals"
                        ),
                        (
                            f"Core concepts of "
                            f"{skill}"
                        ),
                        (
                            f"Practical usage of "
                            f"{skill}"
                        ),
                        (
                            f"Common tools and "
                            f"workflows for "
                            f"{skill}"
                        ),
                        (
                            f"Best practices for "
                            f"{skill}"
                        ),
                    ],
                    "project": (
                        "Build a small practical "
                        f"project demonstrating "
                        f"{skill}."
                    ),
                    "milestone": (
                        "Complete practical "
                        f"work using {skill} "
                        "and demonstrate the "
                        "core concepts."
                    ),
                }
            )

    # -----------------------------------------------------
    # Convert skill-based roadmap into the exact
    # number of weeks selected by the user.
    # -----------------------------------------------------

    roadmap_data = convert_roadmap_to_weeks(
        generated_roadmap,
        payload.duration_weeks,
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
            job_description_id=(
                job_description.id
            ),
            target_role=(
                payload.target_role
            ),
            company_name=(
                payload.company_name
            ),
            duration_weeks=(
                payload.duration_weeks
            ),
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

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    db.commit()
    db.refresh(roadmap)

    # -----------------------------------------------------
    # 8. Return complete intelligence chain
    # -----------------------------------------------------

    return {
        "id": roadmap.id,

        "target_role": (
            roadmap.target_role
        ),

        "company_name": (
            roadmap.company_name
        ),

        "duration_weeks": (
            roadmap.duration_weeks
        ),

        "overall_progress": (
            roadmap.overall_progress
        ),

        "status": roadmap.status,

        "missing_skills": (
            missing_skills
        ),

        "skill_gap_analysis": {
            "total_gaps": (
                skill_gap_result.get(
                    "total_gaps",
                    0,
                )
            ),

            "critical_gap_count": (
                skill_gap_result.get(
                    "critical_gap_count",
                    0,
                )
            ),

            "important_gap_count": (
                skill_gap_result.get(
                    "important_gap_count",
                    0,
                )
            ),

            "optional_gap_count": (
                skill_gap_result.get(
                    "optional_gap_count",
                    0,
                )
            ),

            "summary": (
                skill_gap_result.get(
                    "summary",
                    "",
                )
            ),
        },

        "match": {
            "score": (
                match_result.get(
                    "match_score",
                    match_result.get(
                        "score",
                        0,
                    ),
                )
            ),
        },

        "roadmap": (
            roadmap.roadmap_data
            or []
        ),

        "completed_tasks": (
            roadmap.completed_tasks
            or {}
        ),
    }


# =========================================================
# GET CURRENT CAREER ROADMAP
# =========================================================

@router.get("")
def get_career_roadmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    # -----------------------------------------------------
    # Get current user's latest roadmap
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

    missing_skills: list[str] = []

    for week in roadmap_data:

        if not isinstance(
            week,
            dict,
        ):
            continue

        skills = week.get(
            "skills",
            [],
        )

        if not isinstance(
            skills,
            list,
        ):
            continue

        for skill in skills:

            if (
                isinstance(
                    skill,
                    str,
                )
                and skill not in missing_skills
            ):
                missing_skills.append(
                    skill
                )

    return {
        "id": roadmap.id,

        "target_role": (
            roadmap.target_role
        ),

        "company_name": (
            roadmap.company_name
        ),

        "duration_weeks": (
            roadmap.duration_weeks
        ),

        "overall_progress": (
            roadmap.overall_progress
        ),

        "status": roadmap.status,

        "missing_skills": (
            missing_skills
        ),

        "roadmap": roadmap_data,

        "completed_tasks": (
            completed_tasks
        ),
    }


# =========================================================
# UPDATE ROADMAP TASK
# =========================================================

@router.put("/tasks")
def update_roadmap_task(
    payload: RoadmapTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    # -----------------------------------------------------
    # Find current user's roadmap
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

    if roadmap is None:

        raise HTTPException(
            status_code=404,
            detail="Career roadmap not found",
        )

    # -----------------------------------------------------
    # Get roadmap data
    # -----------------------------------------------------

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

        stored_week = (
            week_data.get(
                "week"
            )
        )

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

            selected_week = (
                week_data
            )

            break

    if selected_week is None:

        raise HTTPException(
            status_code=400,
            detail="Invalid roadmap week",
        )

    # -----------------------------------------------------
    # Validate tasks
    # -----------------------------------------------------

    tasks = selected_week.get(
        "tasks",
        [],
    )

    if not isinstance(
        tasks,
        list,
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid roadmap tasks",
        )

    if (
        payload.task_index < 0
        or payload.task_index
        >= len(tasks)
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

    # Create a new dictionary so SQLAlchemy
    # reliably detects the JSON modification.

    completed_tasks = dict(
        completed_tasks
    )

    # -----------------------------------------------------
    # Create task key
    # -----------------------------------------------------

    task_key = (
        f"{payload.week}-"
        f"{payload.task_index}"
    )

    completed_tasks[task_key] = (
        payload.completed
    )

    # -----------------------------------------------------
    # Save completion data
    # -----------------------------------------------------

    roadmap.completed_tasks = (
        completed_tasks
    )

    # -----------------------------------------------------
    # Calculate overall progress
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

        "task_index": (
            payload.task_index
        ),

        "completed": (
            payload.completed
        ),

        "overall_progress": (
            roadmap.overall_progress
        ),

        "status": roadmap.status,

        "completed_tasks": (
            roadmap.completed_tasks
            or {}
        ),
    }