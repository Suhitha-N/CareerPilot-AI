from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user

from backend.app.models.user import User
from backend.app.models.resume import Resume
from backend.app.models.resume_profile import ResumeProfile
from backend.app.models.job_description import JobDescription
from backend.app.models.interview import Interview
from backend.app.models.coding_submission import CodingSubmission
from backend.app.models.career_roadmap import CareerRoadmap
from backend.app.models.daily_plan import DailyPlanTask
from backend.app.models.placement_readiness import PlacementReadiness
from backend.app.models.placement_readiness_history import (
    PlacementReadinessHistory,
)


router = APIRouter(
    prefix="/api/placement-readiness",
    tags=["Placement Readiness"],
)


# ==========================================================
# RESPONSE SCHEMA
# ==========================================================

class ReadinessResponse(BaseModel):
    id: int
    overall_score: int
    resume_score: int
    job_match_score: int
    interview_score: int
    coding_score: int
    skill_progress: int
    readiness_level: str
    strengths: list
    recommendations: list
    updated_at: datetime


# ==========================================================
# GENERAL HELPERS
# ==========================================================

def clamp_score(
    value: float | int | None,
) -> int:
    """
    Keep a score between 0 and 100.
    """

    if value is None:
        return 0

    return max(
        0,
        min(
            100,
            round(float(value)),
        ),
    )


def get_readiness_level(
    score: int,
) -> str:
    """
    Convert numerical readiness score
    into a human-readable level.
    """

    if score >= 90:
        return "Placement Ready"

    if score >= 75:
        return "Almost Ready"

    if score >= 60:
        return "On Track"

    if score >= 40:
        return "Building Skills"

    return "Getting Started"


# ==========================================================
# KNOWN SKILLS
# ==========================================================

KNOWN_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "c",
    "c++",
    "c#",
    "sql",
    "html",
    "css",
    "react",
    "node",
    "node.js",
    "express",
    "fastapi",
    "django",
    "flask",
    "spring",
    "spring boot",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "git",
    "github",
    "linux",
    "rest",
    "rest api",
    "api",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "ai",
    "nlp",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "scikit-learn",
    "data structures",
    "algorithms",
    "dsa",
    "oop",
    "object oriented programming",
}


def normalize_skill(
    skill: str,
) -> str:
    return (
        skill
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )


# ==========================================================
# RESUME SCORE
# ==========================================================

def calculate_resume_score(
    user_id: int,
    db: Session,
) -> int:
    """
    Calculate resume readiness.

    ATS score is the base score.
    Profile completeness provides a small bonus.
    """

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id == user_id
        )
        .order_by(
            desc(Resume.created_at)
        )
    )

    if not resume:
        return 0

    ats_score = clamp_score(
        resume.ats_score
    )

    profile = db.scalar(
        select(ResumeProfile)
        .where(
            ResumeProfile.resume_id
            == resume.id
        )
    )

    if not profile:
        return ats_score

    profile_bonus = 0

    if profile.skills:
        profile_bonus += 3

    if profile.projects:
        profile_bonus += 2

    if profile.experience:
        profile_bonus += 2

    if profile.education:
        profile_bonus += 2

    if profile.certifications:
        profile_bonus += 1

    return clamp_score(
        ats_score + profile_bonus
    )


# ==========================================================
# CANDIDATE SKILLS
# ==========================================================

def extract_candidate_skills(
    resume: Resume | None,
    profile: ResumeProfile | None,
) -> set[str]:
    """
    Extract skills from the structured resume profile
    and parsed resume text.
    """

    skills: set[str] = set()

    if profile and profile.skills:

        profile_skills = profile.skills

        if isinstance(
            profile_skills,
            dict,
        ):

            for key, value in profile_skills.items():

                if isinstance(value, list):

                    for item in value:

                        if isinstance(
                            item,
                            str,
                        ):
                            skills.add(
                                normalize_skill(
                                    item
                                )
                            )

                elif isinstance(
                    value,
                    str,
                ):

                    skills.add(
                        normalize_skill(
                            value
                        )
                    )

                if isinstance(
                    key,
                    str,
                ):
                    skills.add(
                        normalize_skill(
                            key
                        )
                    )

        elif isinstance(
            profile_skills,
            list,
        ):

            for item in profile_skills:

                if isinstance(
                    item,
                    str,
                ):
                    skills.add(
                        normalize_skill(
                            item
                        )
                    )

    resume_text = ""

    if resume and resume.parsed_text:
        resume_text = (
            resume.parsed_text.lower()
        )

    for skill in KNOWN_SKILLS:

        if skill.lower() in resume_text:

            skills.add(
                normalize_skill(
                    skill
                )
            )

    return skills


# ==========================================================
# JOB MATCH
# ==========================================================

def calculate_job_match(
    user_id: int,
    db: Session,
) -> int:
    """
    Compare candidate skills with the latest target job.
    """

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id == user_id
        )
        .order_by(
            desc(Resume.created_at)
        )
    )

    if not resume:
        return 0

    profile = db.scalar(
        select(ResumeProfile)
        .where(
            ResumeProfile.resume_id
            == resume.id
        )
    )

    job = db.scalar(
        select(JobDescription)
        .where(
            JobDescription.user_id
            == user_id
        )
        .order_by(
            desc(JobDescription.created_at)
        )
    )

    if not job:
        return 0

    candidate_skills = (
        extract_candidate_skills(
            resume,
            profile,
        )
    )

    required_skills: set[str] = set()

    if job.required_skills:

        if isinstance(
            job.required_skills,
            list,
        ):

            for skill in job.required_skills:

                if isinstance(
                    skill,
                    str,
                ):

                    required_skills.add(
                        normalize_skill(
                            skill
                        )
                    )

    if job.preferred_skills:

        if isinstance(
            job.preferred_skills,
            list,
        ):

            for skill in job.preferred_skills:

                if isinstance(
                    skill,
                    str,
                ):

                    required_skills.add(
                        normalize_skill(
                            skill
                        )
                    )

    if not required_skills:

        return clamp_score(
            resume.ats_score
        )

    matched = 0

    for required in required_skills:

        if required in candidate_skills:

            matched += 1
            continue

        for candidate in candidate_skills:

            if (
                required in candidate
                or candidate in required
            ):

                matched += 1
                break

    score = (
        matched
        / len(required_skills)
    ) * 100

    return clamp_score(score)


# ==========================================================
# INTERVIEW SCORE
# ==========================================================

def calculate_interview_score(
    user_id: int,
    db: Session,
) -> int:
    """
    Calculate interview readiness from completed interviews.

    Uses the latest five completed interviews and
    averages their scores.
    """

    completed_interviews = db.scalars(
        select(Interview)
        .where(
            Interview.user_id == user_id,
            Interview.status == "completed",
            Interview.score.is_not(None),
        )
        .order_by(
            desc(Interview.created_at)
        )
        .limit(5)
    ).all()

    if not completed_interviews:
        return 0

    scores = [
        clamp_score(
            interview.score
        )
        for interview
        in completed_interviews
    ]

    return clamp_score(
        sum(scores)
        / len(scores)
    )


# ==========================================================
# CODING SCORE
# ==========================================================

def calculate_coding_score(
    user_id: int,
    db: Session,
) -> int:
    """
    Calculate coding readiness.

    Components:

        Test Accuracy        60%
        Execution Efficiency 15%
        Recent Performance   15%
        Consistency          10%

    This matches the Coding Analytics engine.
    """

    submissions = db.scalars(
        select(CodingSubmission)
        .where(
            CodingSubmission.user_id
            == user_id
        )
        .order_by(
            desc(
                CodingSubmission.created_at
            )
        )
    ).all()

    if not submissions:
        return 0

    # ------------------------------------------------------
    # TEST ACCURACY
    # ------------------------------------------------------

    total_tests = sum(
        submission.total_tests or 0
        for submission in submissions
    )

    passed_tests = sum(
        submission.passed_tests or 0
        for submission in submissions
    )

    if total_tests > 0:

        test_accuracy = (
            passed_tests
            / total_tests
        ) * 100

    else:

        test_accuracy = 0

    # ------------------------------------------------------
    # EXECUTION EFFICIENCY
    # ------------------------------------------------------

    execution_scores = []

    for submission in submissions:

        execution_time = (
            submission.execution_time_ms
            or 0
        )

        if execution_time <= 100:
            efficiency = 100

        elif execution_time <= 250:
            efficiency = 90

        elif execution_time <= 500:
            efficiency = 80

        elif execution_time <= 1000:
            efficiency = 65

        elif execution_time <= 2000:
            efficiency = 50

        else:
            efficiency = 35

        execution_scores.append(
            efficiency
        )

    execution_efficiency = (
        sum(execution_scores)
        / len(execution_scores)
    )

    # ------------------------------------------------------
    # RECENT PERFORMANCE
    # ------------------------------------------------------

    recent_submissions = submissions[:5]

    recent_scores = [
        submission.score or 0
        for submission
        in recent_submissions
    ]

    recent_performance = (
        sum(recent_scores)
        / len(recent_scores)
    )

    # ------------------------------------------------------
    # CONSISTENCY
    # ------------------------------------------------------

    accepted_submissions = sum(
        1
        for submission in submissions
        if submission.status
        == "Accepted"
    )

    consistency = (
        accepted_submissions
        / len(submissions)
    ) * 100

    # ------------------------------------------------------
    # FINAL CODING SCORE
    # ------------------------------------------------------

    coding_score = (
        (test_accuracy * 0.60)
        + (execution_efficiency * 0.15)
        + (recent_performance * 0.15)
        + (consistency * 0.10)
    )

    return clamp_score(
        coding_score
    )


# ==========================================================
# SKILL PROGRESS
# ==========================================================

def calculate_skill_progress(
    user_id: int,
    db: Session,
) -> int:
    """
    Calculate learning/skill-development progress.

    Skill coverage -> 70%
    Roadmap        -> 20%
    Daily plan     -> 10%
    """

    resume = db.scalar(
        select(Resume)
        .where(
            Resume.user_id == user_id
        )
        .order_by(
            desc(Resume.created_at)
        )
    )

    profile = None

    if resume:

        profile = db.scalar(
            select(ResumeProfile)
            .where(
                ResumeProfile.resume_id
                == resume.id
            )
        )

    job = db.scalar(
        select(JobDescription)
        .where(
            JobDescription.user_id
            == user_id
        )
        .order_by(
            desc(JobDescription.created_at)
        )
    )

    candidate_skills = (
        extract_candidate_skills(
            resume,
            profile,
        )
    )

    required_skills: set[str] = set()

    if job:

        if job.required_skills:

            if isinstance(
                job.required_skills,
                list,
            ):

                for skill in job.required_skills:

                    if isinstance(
                        skill,
                        str,
                    ):

                        required_skills.add(
                            normalize_skill(
                                skill
                            )
                        )

        if job.preferred_skills:

            if isinstance(
                job.preferred_skills,
                list,
            ):

                for skill in job.preferred_skills:

                    if isinstance(
                        skill,
                        str,
                    ):

                        required_skills.add(
                            normalize_skill(
                                skill
                            )
                        )

    # ------------------------------------------------------
    # SKILL COVERAGE
    # ------------------------------------------------------

    if required_skills:

        matched = 0

        for required in required_skills:

            if required in candidate_skills:

                matched += 1
                continue

            for candidate in candidate_skills:

                if (
                    required in candidate
                    or candidate in required
                ):

                    matched += 1
                    break

        skill_coverage = (
            matched
            / len(required_skills)
        ) * 100

    else:

        skill_coverage = (
            50
            if candidate_skills
            else 0
        )

    # ------------------------------------------------------
    # ROADMAP PROGRESS
    # ------------------------------------------------------

    roadmap = db.scalar(
        select(CareerRoadmap)
        .where(
            CareerRoadmap.user_id
            == user_id
        )
        .order_by(
            desc(CareerRoadmap.created_at)
        )
    )

    roadmap_progress = 0

    if roadmap:

        roadmap_progress = clamp_score(
            roadmap.overall_progress
        )

    # ------------------------------------------------------
    # DAILY PLAN PROGRESS
    # ------------------------------------------------------

    today = date.today()

    daily_tasks = db.scalars(
        select(DailyPlanTask)
        .where(
            DailyPlanTask.user_id
            == user_id,
            DailyPlanTask.plan_date
            == today,
        )
    ).all()

    daily_progress = 0

    if daily_tasks:

        completed_count = sum(
            1
            for task in daily_tasks
            if task.completed
        )

        daily_progress = (
            completed_count
            / len(daily_tasks)
        ) * 100

    # ------------------------------------------------------
    # FINAL SKILL SCORE
    # ------------------------------------------------------

    score = (
        (skill_coverage * 0.70)
        + (roadmap_progress * 0.20)
        + (daily_progress * 0.10)
    )

    return clamp_score(score)


# ==========================================================
# STRENGTHS
# ==========================================================

def generate_strengths(
    resume_score: int,
    job_match_score: int,
    interview_score: int,
    coding_score: int,
    skill_progress: int,
) -> list[str]:

    metrics = {
        "Resume": resume_score,
        "Job Match": job_match_score,
        "Interview": interview_score,
        "Coding": coding_score,
        "Skill Development": skill_progress,
    }

    strengths = []

    sorted_metrics = sorted(
        metrics.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    for name, score in sorted_metrics:

        if score >= 75:

            strengths.append(
                f"{name} is strong ({score}%)."
            )

    if not strengths:

        strengths.append(
            "You have started building "
            "your placement profile."
        )

    return strengths[:4]


# ==========================================================
# RECOMMENDATIONS
# ==========================================================

def generate_recommendations(
    resume_score: int,
    job_match_score: int,
    interview_score: int,
    coding_score: int,
    skill_progress: int,
) -> list[str]:

    recommendations = []

    if resume_score < 75:

        recommendations.append(
            "Improve your resume ATS score "
            "and strengthen project descriptions."
        )

    if job_match_score < 75:

        recommendations.append(
            "Close the missing skills between "
            "your resume and target job."
        )

    if interview_score < 75:

        recommendations.append(
            "Practice more mock interviews "
            "and improve weak answer areas."
        )

    if coding_score < 75:

        recommendations.append(
            "Complete more coding problems "
            "and focus on weak DSA topics."
        )

    if skill_progress < 75:

        recommendations.append(
            "Continue your personalized career "
            "roadmap consistently."
        )

    if not recommendations:

        recommendations.append(
            "Maintain your current performance "
            "and practice consistently."
        )

    return recommendations[:5]


# ==========================================================
# SAVE DAILY HISTORY
# ==========================================================

def save_readiness_history(
    user_id: int,
    readiness: PlacementReadiness,
    db: Session,
) -> None:
    """
    Keep one readiness snapshot per UTC day.
    """

    today_start = datetime.combine(
        date.today(),
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    tomorrow_start = (
        today_start
        + timedelta(days=1)
    )

    existing = db.scalar(
        select(
            PlacementReadinessHistory
        )
        .where(
            PlacementReadinessHistory.user_id
            == user_id,
            PlacementReadinessHistory.created_at
            >= today_start,
            PlacementReadinessHistory.created_at
            < tomorrow_start,
        )
        .order_by(
            desc(
                PlacementReadinessHistory.created_at
            )
        )
    )

    if existing:

        existing.overall_score = (
            readiness.overall_score
        )

        existing.resume_score = (
            readiness.resume_score
        )

        existing.job_match_score = (
            readiness.job_match_score
        )

        existing.interview_score = (
            readiness.interview_score
        )

        existing.coding_score = (
            readiness.coding_score
        )

        existing.skill_progress = (
            readiness.skill_progress
        )

        existing.readiness_level = (
            readiness.readiness_level
        )

    else:

        history = PlacementReadinessHistory(
            user_id=user_id,
            overall_score=(
                readiness.overall_score
            ),
            resume_score=(
                readiness.resume_score
            ),
            job_match_score=(
                readiness.job_match_score
            ),
            interview_score=(
                readiness.interview_score
            ),
            coding_score=(
                readiness.coding_score
            ),
            skill_progress=(
                readiness.skill_progress
            ),
            readiness_level=(
                readiness.readiness_level
            ),
        )

        db.add(history)


# ==========================================================
# MAIN READINESS ENGINE
# ==========================================================

def calculate_and_save_readiness(
    user_id: int,
    db: Session,
) -> PlacementReadiness:

    # ------------------------------------------------------
    # INDIVIDUAL SCORES
    # ------------------------------------------------------

    resume_score = calculate_resume_score(
        user_id,
        db,
    )

    job_match_score = calculate_job_match(
        user_id,
        db,
    )

    interview_score = (
        calculate_interview_score(
            user_id,
            db,
        )
    )

    coding_score = calculate_coding_score(
        user_id,
        db,
    )

    skill_progress = (
        calculate_skill_progress(
            user_id,
            db,
        )
    )

    # ------------------------------------------------------
    # WEIGHTED OVERALL SCORE
    #
    # Resume       = 20%
    # Job Match    = 20%
    # Interview    = 25%
    # Coding       = 25%
    # Skills       = 10%
    #
    # Total        = 100%
    # ------------------------------------------------------

    overall_score = clamp_score(
        (resume_score * 0.20)
        + (job_match_score * 0.20)
        + (interview_score * 0.25)
        + (coding_score * 0.25)
        + (skill_progress * 0.10)
    )

    readiness_level = (
        get_readiness_level(
            overall_score
        )
    )

    strengths = generate_strengths(
        resume_score,
        job_match_score,
        interview_score,
        coding_score,
        skill_progress,
    )

    recommendations = (
        generate_recommendations(
            resume_score,
            job_match_score,
            interview_score,
            coding_score,
            skill_progress,
        )
    )

    # ------------------------------------------------------
    # FIND EXISTING READINESS
    # ------------------------------------------------------

    readiness = db.scalar(
        select(PlacementReadiness)
        .where(
            PlacementReadiness.user_id
            == user_id
        )
    )

    # ------------------------------------------------------
    # CREATE
    # ------------------------------------------------------

    if not readiness:

        readiness = PlacementReadiness(
            user_id=user_id,
            overall_score=overall_score,
            resume_score=resume_score,
            job_match_score=job_match_score,
            interview_score=interview_score,
            coding_score=coding_score,
            skill_progress=skill_progress,
            readiness_level=readiness_level,
            strengths=strengths,
            recommendations=recommendations,
        )

        db.add(readiness)

    # ------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------

    else:

        readiness.overall_score = (
            overall_score
        )

        readiness.resume_score = (
            resume_score
        )

        readiness.job_match_score = (
            job_match_score
        )

        readiness.interview_score = (
            interview_score
        )

        readiness.coding_score = (
            coding_score
        )

        readiness.skill_progress = (
            skill_progress
        )

        readiness.readiness_level = (
            readiness_level
        )

        readiness.strengths = (
            strengths
        )

        readiness.recommendations = (
            recommendations
        )

    # Make sure the readiness object has
    # its current values before history.
    db.flush()

    # ------------------------------------------------------
    # SAVE HISTORY
    # ------------------------------------------------------

    save_readiness_history(
        user_id,
        readiness,
        db,
    )

    # ------------------------------------------------------
    # COMMIT
    # ------------------------------------------------------

    db.commit()

    db.refresh(readiness)

    return readiness


# ==========================================================
# CURRENT READINESS
# ==========================================================

@router.get(
    "",
    response_model=ReadinessResponse,
)
def get_placement_readiness(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):

    readiness = (
        calculate_and_save_readiness(
            current_user.id,
            db,
        )
    )

    return {
        "id": readiness.id,
        "overall_score": (
            readiness.overall_score
        ),
        "resume_score": (
            readiness.resume_score
        ),
        "job_match_score": (
            readiness.job_match_score
        ),
        "interview_score": (
            readiness.interview_score
        ),
        "coding_score": (
            readiness.coding_score
        ),
        "skill_progress": (
            readiness.skill_progress
        ),
        "readiness_level": (
            readiness.readiness_level
        ),
        "strengths": (
            readiness.strengths or []
        ),
        "recommendations": (
            readiness.recommendations or []
        ),
        "updated_at": (
            readiness.updated_at
        ),
    }


# ==========================================================
# READINESS HISTORY
# ==========================================================

@router.get("/history")
def get_readiness_history(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):

    history = db.scalars(
        select(
            PlacementReadinessHistory
        )
        .where(
            PlacementReadinessHistory.user_id
            == current_user.id
        )
        .order_by(
            PlacementReadinessHistory.created_at.asc()
        )
    ).all()

    return {
        "history": [
            {
                "id": item.id,
                "overall_score": (
                    item.overall_score
                ),
                "resume_score": (
                    item.resume_score
                ),
                "job_match_score": (
                    item.job_match_score
                ),
                "interview_score": (
                    item.interview_score
                ),
                "coding_score": (
                    item.coding_score
                ),
                "skill_progress": (
                    item.skill_progress
                ),
                "readiness_level": (
                    item.readiness_level
                ),
                "created_at": (
                    item.created_at
                ),
            }
            for item in history
        ]
    }