from typing import Any
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user

from backend.app.models.user import User
from backend.app.models.resume import Resume
from backend.app.models.resume_profile import ResumeProfile
from backend.app.models.job_description import JobDescription
from backend.app.models.placement_readiness import PlacementReadiness
from backend.app.models.career_roadmap import CareerRoadmap
from backend.app.models.daily_plan import DailyPlanTask

from backend.app.services.ai_service import generate_ai_answer


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/assistant",
    tags=["CareerPilot AI Assistant"],
)


# =========================================================
# REQUEST / RESPONSE SCHEMAS
# =========================================================

class AssistantChatRequest(BaseModel):
    message: str


class AssistantChatResponse(BaseModel):
    answer: str
    context: dict[str, Any]


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def extract_resume_skills(
    profile: ResumeProfile | None,
) -> list[str]:

    if profile is None or not profile.skills:
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


# =========================================================
# COMPLETED TASK COUNT
# =========================================================

def get_completed_task_count(
    roadmap: CareerRoadmap | None,
) -> int:

    if roadmap is None:
        return 0

    completed_tasks = roadmap.completed_tasks or {}

    if not isinstance(completed_tasks, dict):
        return 0

    return sum(
        1
        for value in completed_tasks.values()
        if value is True
    )


# =========================================================
# ROADMAP SUMMARY
# =========================================================

def get_roadmap_summary(
    roadmap: CareerRoadmap | None,
) -> dict[str, Any]:

    if roadmap is None:

        return {
            "exists": False,
            "target_role": None,
            "company_name": None,
            "duration_weeks": 0,
            "progress": 0,
            "status": None,
            "skill_gaps": [],
            "completed_tasks": 0,
        }

    roadmap_data = roadmap.roadmap_data or []

    skill_gaps: list[str] = []

    # -----------------------------------------------------
    # IMPORTANT:
    # Roadmap skills are authoritative skill gaps.
    # We do NOT calculate them again inside Ollama.
    # -----------------------------------------------------

    if isinstance(roadmap_data, list):

        for week in roadmap_data:

            if not isinstance(week, dict):
                continue

            skills = week.get("skills", [])

            if isinstance(skills, list):

                for skill in skills:

                    if isinstance(skill, str) and skill.strip():
                        skill_gaps.append(skill.strip())

    return {
        "exists": True,
        "target_role": roadmap.target_role,
        "company_name": roadmap.company_name,
        "duration_weeks": roadmap.duration_weeks,
        "progress": roadmap.overall_progress,
        "status": roadmap.status,
        "skill_gaps": list(dict.fromkeys(skill_gaps)),
        "completed_tasks": get_completed_task_count(roadmap),
    }


# =========================================================
# BUILD USER CONTEXT
# =========================================================

def build_user_context(
    db: Session,
    current_user: User,
) -> dict[str, Any]:

    # =====================================================
    # LATEST RESUME
    # =====================================================

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id == current_user.id
        )
        .order_by(
            Resume.created_at.desc()
        )
    )

    profile = None

    if resume is not None:

        profile = db.scalar(
            select(ResumeProfile)
            .where(
                ResumeProfile.resume_id == resume.id
            )
        )

    resume_context = {
        "exists": resume is not None,

        "file_name": (
            resume.file_name
            if resume
            else None
        ),

        "ats_score": (
            resume.ats_score
            if resume
            else 0
        ),

        "skills": extract_resume_skills(profile),
    }

    # =====================================================
    # LATEST JOB DESCRIPTION
    # =====================================================

    job = db.scalar(
        select(JobDescription)
        .where(
            JobDescription.user_id == current_user.id
        )
        .order_by(
            JobDescription.created_at.desc()
        )
    )

    job_context = {
        "exists": job is not None,

        "title": (
            job.title
            if job
            else None
        ),

        "company_name": (
            job.company_name
            if job
            else None
        ),

        "required_skills": (
            job.required_skills
            if job
            and isinstance(
                job.required_skills,
                list,
            )
            else []
        ),

        "preferred_skills": (
            job.preferred_skills
            if job
            and isinstance(
                job.preferred_skills,
                list,
            )
            else []
        ),
    }

    # =====================================================
    # PLACEMENT READINESS
    # =====================================================

    readiness = db.scalar(
        select(PlacementReadiness)
        .where(
            PlacementReadiness.user_id == current_user.id
        )
    )

    readiness_context = {
        "exists": readiness is not None,

        "overall_score": (
            readiness.overall_score
            if readiness
            else 0
        ),

        "resume_score": (
            readiness.resume_score
            if readiness
            else 0
        ),

        "job_match_score": (
            readiness.job_match_score
            if readiness
            else 0
        ),

        "interview_score": (
            readiness.interview_score
            if readiness
            else 0
        ),

        "coding_score": (
            readiness.coding_score
            if readiness
            else 0
        ),

        "skill_progress": (
            readiness.skill_progress
            if readiness
            else 0
        ),

        "readiness_level": (
            readiness.readiness_level
            if readiness
            else "Getting Started"
        ),

        "strengths": (
            readiness.strengths or []
            if readiness
            else []
        ),

        "recommendations": (
            readiness.recommendations or []
            if readiness
            else []
        ),
    }

    # =====================================================
    # LATEST CAREER ROADMAP
    # =====================================================

    roadmap = db.scalar(
        select(CareerRoadmap)
        .where(
            CareerRoadmap.user_id == current_user.id
        )
        .order_by(
            CareerRoadmap.created_at.desc()
        )
    )

    roadmap_context = get_roadmap_summary(
        roadmap
    )

    # =====================================================
    # FINAL CONTEXT
    # =====================================================

    return {
        "user": {
            "name": current_user.name,
            "role": current_user.role,
        },

        "resume": resume_context,

        "job": job_context,

        "readiness": readiness_context,

        "roadmap": roadmap_context,
    }


# =========================================================
# DAILY PLAN DETECTION
# =========================================================

def is_daily_plan_question(
    message: str,
) -> bool:

    question = message.lower().strip()

    daily_plan_phrases = [
        "what should i do today",
        "what should i do today?",
        "what do i do today",
        "what can i do today",
        "today's plan",
        "todays plan",
        "daily plan",
        "plan for today",
        "today plan",
        "my plan today",
    ]

    return any(
        phrase in question
        for phrase in daily_plan_phrases
    )


# =========================================================
# DAILY PLAN GENERATOR
# =========================================================

def generate_daily_plan(
    db: Session,
    current_user: User,
    context: dict[str, Any],
) -> str:

    readiness = context["readiness"]
    roadmap = context["roadmap"]
    resume = context["resume"]

    today = date.today()

    # =====================================================
    # DETERMINE TODAY'S PRIORITY
    # =====================================================

    score_areas = {
        "Interview Preparation": readiness["interview_score"],
        "Coding Practice": readiness["coding_score"],
        "Job Matching": readiness["job_match_score"],
        "Resume Improvement": readiness["resume_score"],
        "Skill Development": readiness["skill_progress"],
    }

    priority = min(
        score_areas,
        key=score_areas.get,
    )

    priority_score = score_areas[priority]

    # =====================================================
    # DETERMINE SKILLS TO FOCUS ON
    # =====================================================

    skill_gaps = roadmap["skill_gaps"]

    if skill_gaps:
        focus_skills = skill_gaps[:3]

    else:
        focus_skills = resume["skills"][:3]

    if not focus_skills:

        focus_skills = [
            "Data Structures",
            "Python",
            "SQL",
        ]

    # =====================================================
    # BUILD PERSONALIZED ACTIVITIES
    # =====================================================

    activities: list[tuple[str, str]] = []

    if priority == "Interview Preparation":

        activities = [
            (
                f"Practice 5 interview questions related to "
                f"{focus_skills[0]}",
                "30 minutes",
            ),
            (
                "Complete one mock interview session and "
                "review your answers",
                "30 minutes",
            ),
            (
                "Write strong STAR-format answers for 3 "
                "common behavioral questions",
                "20 minutes",
            ),
        ]

    elif priority == "Coding Practice":

        activities = [
            (
                f"Solve 2 coding problems using "
                f"{focus_skills[0]} concepts",
                "45 minutes",
            ),
            (
                "Practice one Data Structures problem "
                "and analyze its time complexity",
                "30 minutes",
            ),
            (
                "Review mistakes from your coding practice",
                "15 minutes",
            ),
        ]

    elif priority == "Job Matching":

        activities = [
            (
                "Review the required skills in your target "
                "job description",
                "20 minutes",
            ),
            (
                f"Study the skill: {focus_skills[0]}",
                "40 minutes",
            ),
            (
                "Update one resume section to better match "
                "your target role",
                "20 minutes",
            ),
        ]

    elif priority == "Resume Improvement":

        activities = [
            (
                "Improve 2 resume bullet points using "
                "strong action verbs and measurable results",
                "30 minutes",
            ),
            (
                f"Add evidence of your {focus_skills[0]} "
                "experience to a project or skills section",
                "30 minutes",
            ),
            (
                "Review your resume for ATS-friendly "
                "keywords and formatting",
                "20 minutes",
            ),
        ]

    else:

        second_skill = (
            focus_skills[1]
            if len(focus_skills) > 1
            else focus_skills[0]
        )

        activities = [
            (
                f"Learn the fundamentals of {focus_skills[0]}",
                "40 minutes",
            ),
            (
                f"Practice {second_skill} "
                "with a small hands-on exercise",
                "30 minutes",
            ),
            (
                f"Review what you learned about "
                f"{focus_skills[0]} and write 5 key points",
                "20 minutes",
            ),
        ]

    # =====================================================
    # SAVE TODAY'S PLAN TO POSTGRESQL
    # =====================================================

    existing_tasks = list(
        db.scalars(
            select(DailyPlanTask)
            .where(
                DailyPlanTask.user_id == current_user.id,
                DailyPlanTask.plan_date == today,
            )
            .order_by(
                DailyPlanTask.task_index
            )
        ).all()
    )

    existing_signature = [
        (
            task.task_text,
            task.duration,
        )
        for task in existing_tasks
    ]

    new_signature = activities

    # -----------------------------------------------------
    # Do not recreate tasks if today's plan is unchanged.
    # This preserves completed checkboxes.
    # -----------------------------------------------------

    if existing_signature != new_signature:

        for task in existing_tasks:
            db.delete(task)

        db.flush()

        for index, (
            task_text,
            duration,
        ) in enumerate(activities):

            db.add(
                DailyPlanTask(
                    user_id=current_user.id,
                    plan_date=today,
                    task_index=index,
                    task_text=task_text,
                    duration=duration,
                    completed=False,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
            )

        db.commit()

    # =====================================================
    # ROADMAP INFORMATION
    # =====================================================

    roadmap_progress = roadmap["progress"]

    # =====================================================
    # CALCULATE TOTAL TIME
    # =====================================================

    total_minutes = 0

    for _, duration in activities:

        parts = duration.split()

        if not parts:
            continue

        try:
            value = int(parts[0])
        except ValueError:
            continue

        if "hour" in duration.lower():
            total_minutes += value * 60

        else:
            total_minutes += value

    # =====================================================
    # STRUCTURED RESPONSE
    # =====================================================

    lines = [
        "Here is your personalized CareerPilot plan for today.",
        "",
        f"Main Priority: {priority} ({priority_score}%)",
        "",
        "Skill Focus: "
        + ", ".join(focus_skills),
        "",
        "Today's Activities:",
    ]

    for index, (
        task_text,
        duration,
    ) in enumerate(
        activities,
        start=1,
    ):

        lines.append(
            f"{index}. [{duration}] {task_text}"
        )

    lines.extend(
        [
            "",
            f"Total Time: {total_minutes} minutes",
            "",
            f"Roadmap Progress: {roadmap_progress}%",
        ]
    )

    return "\n".join(lines)


# =========================================================
# EXACT / DETERMINISTIC ANSWERS
# =========================================================

def generate_deterministic_answer(
    message: str,
    context: dict[str, Any],
) -> str | None:

    question = message.lower().strip()

    name = context["user"]["name"]

    resume = context["resume"]
    job = context["job"]
    readiness = context["readiness"]
    roadmap = context["roadmap"]

    skills = resume["skills"]
    skill_gaps = roadmap["skill_gaps"]

    # =====================================================
    # 1. SKILL GAP QUESTIONS
    # =====================================================

    skill_gap_question = (
        "skill gap" in question
        or "skill gaps" in question
        or "missing skill" in question
        or "missing skills" in question
        or "skills am i missing" in question
        or "which skills am i missing" in question
        or "what skills am i missing" in question
    )

    if skill_gap_question:

        if not roadmap["exists"]:

            return (
                f"{name}, you don't have a career "
                f"roadmap yet. Generate a roadmap after "
                f"adding your target job."
            )

        if not skill_gaps:

            return (
                f"{name}, there are currently no recorded "
                f"skill gaps in your CareerPilot roadmap."
            )

        lines = [
            f"{name}, your current skill gaps are:"
        ]

        for index, skill in enumerate(
            skill_gaps,
            start=1,
        ):

            lines.append(
                f"{index}. {skill}"
            )

        lines.append("")

        lines.append(
            f"Your Career Roadmap is currently "
            f"{roadmap['progress']}% complete."
        )

        lines.append(
            "Focus on these skills in your roadmap "
            "before moving to lower-priority topics."
        )

        return "\n".join(lines)

    # =====================================================
    # 2. PLACEMENT READINESS
    # =====================================================

    readiness_question = (
        "placement readiness" in question
        or "readiness score" in question
        or "placement score" in question
        or "am i ready" in question
        or "how ready am i" in question
        or "readiness" in question
    )

    if readiness_question:

        return (
            f"{name}, your current Placement Readiness "
            f"score is {readiness['overall_score']}/100.\n\n"
            f"**Readiness Level:** "
            f"{readiness['readiness_level']}\n\n"
            f"- Resume: {readiness['resume_score']}%\n"
            f"- Job Match: {readiness['job_match_score']}%\n"
            f"- Interview: {readiness['interview_score']}%\n"
            f"- Coding: {readiness['coding_score']}%\n"
            f"- Skill Progress: {readiness['skill_progress']}%\n\n"
            f"Your next priority should be improving "
            f"the lower-scoring areas."
        )

    # =====================================================
    # 3. RESUME / ATS
    # =====================================================

    resume_question = (
        "resume score" in question
        or "ats score" in question
        or "ats" in question
        or "my resume" in question
        or "my cv" in question
    )

    if resume_question:

        if not resume["exists"]:

            return (
                f"{name}, you haven't uploaded a resume yet."
            )

        resume_skills = (
            ", ".join(skills)
            if skills
            else "No skills extracted yet"
        )

        return (
            f"{name}, your latest resume has an ATS "
            f"score of {resume['ats_score']}%.\n\n"
            f"**Extracted Skills:**\n"
            f"{resume_skills}\n\n"
            f"Use your target job requirements and "
            f"recorded skill gaps to improve alignment."
        )

    # =====================================================
    # 4. ROADMAP PROGRESS
    # =====================================================

    roadmap_question = (
        "roadmap progress" in question
        or "how much roadmap" in question
        or "roadmap" in question
    )

    if roadmap_question:

        if not roadmap["exists"]:

            return (
                f"{name}, you don't have a career "
                f"roadmap yet."
            )

        return (
            f"{name}, your Career Roadmap is "
            f"{roadmap['progress']}% complete.\n\n"
            f"**Target Role:** "
            f"{roadmap['target_role'] or 'Not specified'}\n"
            f"**Company:** "
            f"{roadmap['company_name'] or 'Not specified'}\n"
            f"**Duration:** "
            f"{roadmap['duration_weeks']} weeks\n"
            f"**Status:** "
            f"{roadmap['status'] or 'active'}\n"
            f"**Completed Tasks:** "
            f"{roadmap['completed_tasks']}"
        )

    # =====================================================
    # 5. TARGET JOB
    # =====================================================

    job_question = (
        "target job" in question
        or "target role" in question
        or "job match" in question
        or "which job" in question
        or "company" in question
    )

    if job_question:

        if not job["exists"]:

            return (
                f"{name}, you haven't added a target "
                f"job description yet."
            )

        company = (
            job["company_name"]
            or "Not specified"
        )

        required = job["required_skills"] or []

        required_text = (
            ", ".join(
                str(skill)
                for skill in required
            )
            if required
            else "No required skills recorded"
        )

        return (
            f"{name}, your current target job is:\n\n"
            f"**Role:** {job['title']}\n"
            f"**Company:** {company}\n"
            f"**Job Match Score:** "
            f"{readiness['job_match_score']}%\n\n"
            f"**Required Skills:**\n"
            f"{required_text}"
        )

    # =====================================================
    # No deterministic match
    # Ollama will handle the question.
    # =====================================================

    return None


# =========================================================
# LOCAL OLLAMA RESPONSE
# =========================================================

def generate_personalized_ai_answer(
    message: str,
    context: dict[str, Any],
) -> str:

    return generate_ai_answer(
        user_message=message,
        context=context,
    )


# =========================================================
# CHAT ENDPOINT
# =========================================================

@router.post(
    "/chat",
    response_model=AssistantChatResponse,
)
def chat_with_careerpilot(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # =====================================================
    # VALIDATE MESSAGE
    # =====================================================

    message = payload.message.strip()

    if not message:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    if len(message) > 2000:

        raise HTTPException(
            status_code=400,
            detail="Message is too long.",
        )

    # =====================================================
    # BUILD LIVE DATABASE CONTEXT
    # =====================================================

    context = build_user_context(
        db=db,
        current_user=current_user,
    )

    # =====================================================
    # DAILY PLAN
    # =====================================================

    if is_daily_plan_question(message):

        daily_plan_answer = generate_daily_plan(
            db=db,
            current_user=current_user,
            context=context,
        )

        return {
            "answer": daily_plan_answer,
            "context": context,
        }

    # =====================================================
    # FIRST TRY DETERMINISTIC BACKEND ANSWER
    # =====================================================

    deterministic_answer = generate_deterministic_answer(
        message=message,
        context=context,
    )

    if deterministic_answer is not None:

        return {
            "answer": deterministic_answer,
            "context": context,
        }

    # =====================================================
    # OTHERWISE USE LOCAL OLLAMA AI
    # =====================================================

    try:

        answer = generate_personalized_ai_answer(
            message=message,
            context=context,
        )

    except Exception as exc:

        print(
            f"CareerPilot AI error: {exc}"
        )

        # Safe fallback if Ollama is unavailable

        answer = (
            f"{current_user.name}, I'm currently unable "
            f"to connect to the local AI model. "
            f"Your CareerPilot data is still available. "
            f"Try asking about your resume, skill gaps, "
            f"placement readiness, target job, or roadmap."
        )

    # =====================================================
    # RETURN RESPONSE
    # =====================================================

    return {
        "answer": answer,
        "context": context,
    }
