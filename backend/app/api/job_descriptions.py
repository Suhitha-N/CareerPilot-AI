from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user

from backend.app.models.job_description import JobDescription
from backend.app.models.resume import Resume
from backend.app.models.resume_profile import ResumeProfile
from backend.app.models.user import User

from backend.app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionResponse,
)

from backend.app.services.jd_analyzer import (
    analyze_job_description,
)

from backend.app.services.job_matcher import (
    calculate_job_match,
)

from backend.app.services.skill_gap_analyzer import (
    analyze_skill_gaps,
)

from backend.app.services.roadmap_generator import (
    generate_roadmap,
)


router = APIRouter(
    prefix="/api/job-descriptions",
    tags=["Job Descriptions"],
)


@router.post(
    "",
    response_model=JobDescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job_description(
    jd_data: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analysis = analyze_job_description(
        jd_data.description_text
    )

    job_description = JobDescription(
        user_id=current_user.id,
        title=jd_data.title,
        company_name=jd_data.company_name,
        description_text=jd_data.description_text,
        required_skills=analysis["required_skills"],
        preferred_skills=analysis["preferred_skills"],
        experience_requirements=analysis[
            "experience_requirements"
        ],
        education_requirements=analysis[
            "education_requirements"
        ],
        keywords=analysis["keywords"],
    )

    db.add(job_description)
    db.commit()
    db.refresh(job_description)

    return job_description


@router.get(
    "",
    response_model=list[JobDescriptionResponse],
)
def get_job_descriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job_descriptions = db.scalars(
        select(JobDescription)
        .where(
            JobDescription.user_id == current_user.id
        )
        .order_by(
            JobDescription.created_at.desc()
        )
    ).all()

    return list(job_descriptions)


@router.get(
    "/{jd_id}",
    response_model=JobDescriptionResponse,
)
def get_job_description(
    jd_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job_description = db.scalar(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.user_id == current_user.id,
        )
    )

    if job_description is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found.",
        )

    return job_description


@router.post(
    "/{jd_id}/match/{resume_id}",
)
def match_resume_with_job(
    jd_id: int,
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---------------------------------------------------------
    # Find Job Description
    # ---------------------------------------------------------

    job_description = db.scalar(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.user_id == current_user.id,
        )
    )

    if job_description is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found.",
        )

    # ---------------------------------------------------------
    # Find Resume
    # ---------------------------------------------------------

    resume = db.scalar(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )

    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # ---------------------------------------------------------
    # Find Resume Profile
    # ---------------------------------------------------------

    resume_profile = db.scalar(
        select(ResumeProfile).where(
            ResumeProfile.resume_id == resume.id
        )
    )

    if resume_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume profile not found.",
        )

    # ---------------------------------------------------------
    # Prepare Resume Data
    # ---------------------------------------------------------

    resume_profile_data = {
        "skills": resume_profile.skills,
        "projects": resume_profile.projects,
        "experience": resume_profile.experience,
        "education": resume_profile.education,
        "certifications": resume_profile.certifications,
    }

    # ---------------------------------------------------------
    # Prepare Job Description Analysis
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # 1. Job Match Analysis
    # ---------------------------------------------------------

    match_result = calculate_job_match(
        resume_profile_data,
        jd_analysis,
    )

    # ---------------------------------------------------------
    # 2. Skill Gap Analysis
    # ---------------------------------------------------------

    skill_gap_result = analyze_skill_gaps(
        match_result
    )

    # ---------------------------------------------------------
    # 3. Personalized Career Roadmap
    # ---------------------------------------------------------

    roadmap_result = generate_roadmap(
        skill_gap_result
    )

    # ---------------------------------------------------------
    # Final Response
    # ---------------------------------------------------------

    return {
        "job_description": {
            "id": job_description.id,
            "title": job_description.title,
            "company_name": job_description.company_name,
        },
        "resume": {
            "id": resume.id,
            "file_name": resume.file_name,
            "ats_score": resume.ats_score,
        },
        "match": match_result,
        "skill_gap_analysis": skill_gap_result,
        "career_roadmap": roadmap_result,
    }