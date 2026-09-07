from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.resume import Resume
from backend.app.models.resume_profile import ResumeProfile
from backend.app.models.user import User
from backend.app.services.ats_scorer import calculate_ats_score
from backend.app.services.resume_analyzer import analyze_resume
from backend.app.services.resume_parser import extract_resume_text


router = APIRouter(
    prefix="/api/resumes",
    tags=["Resumes"],
)


UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ==========================================================
# GET ALL RESUMES
# ==========================================================

@router.get("")
def get_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all resumes belonging to the currently logged-in user.
    """

    resumes = db.scalars(
        select(Resume)
        .where(
            Resume.user_id == current_user.id
        )
        .order_by(
            Resume.created_at.desc()
        )
    ).all()

    return [
        {
            "id": resume.id,
            "file_name": resume.file_name,
            "ats_score": resume.ats_score,
        }
        for resume in resumes
    ]


# ==========================================================
# UPLOAD RESUME
# ==========================================================

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------
    # 1. Validate filename
    # --------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    # --------------------------------------------------
    # 2. Validate file extension
    # --------------------------------------------------

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed.",
        )

    # --------------------------------------------------
    # 3. Read uploaded file
    # --------------------------------------------------

    contents = await file.read()

    # --------------------------------------------------
    # 4. Validate file size
    # --------------------------------------------------

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be 5 MB or less.",
        )

    # --------------------------------------------------
    # 5. Generate secure storage filename
    # --------------------------------------------------

    stored_filename = (
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        UPLOAD_DIR / stored_filename
    )

    file_path.write_bytes(contents)

    file_type = extension.replace(
        ".",
        "",
    )

    # --------------------------------------------------
    # 6. Extract resume text
    # --------------------------------------------------

    try:
        parsed_text = extract_resume_text(
            str(file_path),
            file_type,
        )

    except Exception as exc:

        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=400,
            detail=f"Unable to parse resume: {exc}",
        )

    # --------------------------------------------------
    # 7. Analyze resume and calculate ATS score
    # --------------------------------------------------

    try:
        analysis = analyze_resume(
            parsed_text
        )

        ats_result = calculate_ats_score(
            analysis
        )

        ats_score = ats_result["score"]

    except Exception as exc:

        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=400,
            detail=f"Unable to analyze resume: {exc}",
        )

    # --------------------------------------------------
    # 8. Save Resume record
    # --------------------------------------------------

    resume = Resume(
        user_id=current_user.id,
        file_name=file.filename,
        file_path=str(file_path),
        file_type=file_type,
        parsed_text=parsed_text,
        ats_score=ats_score,
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    # --------------------------------------------------
    # 9. Save structured ResumeProfile
    # --------------------------------------------------

    resume_profile = ResumeProfile(
        resume_id=resume.id,

        summary=analysis.get(
            "summary"
        ),

        skills=analysis.get(
            "skills"
        ),

        projects=analysis.get(
            "projects"
        ),

        experience=analysis.get(
            "experience"
        ),

        education=analysis.get(
            "education"
        ),

        certifications=analysis.get(
            "certifications"
        ),

        achievements=analysis.get(
            "achievements"
        ),
    )

    db.add(resume_profile)
    db.commit()
    db.refresh(resume_profile)

    # --------------------------------------------------
    # 10. Return response
    # --------------------------------------------------

    return {
        "message": "Resume uploaded and analyzed successfully.",

        "resume_id": resume.id,

        "profile_id": resume_profile.id,

        "file_name": resume.file_name,

        "file_type": resume.file_type,

        "ats_score": resume.ats_score,

        "ats_breakdown": ats_result["breakdown"],

        "ats_suggestions": ats_result["suggestions"],

        "analysis": analysis,
    }