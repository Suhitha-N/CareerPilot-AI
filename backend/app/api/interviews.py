from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user

from backend.app.models.interview import Interview
from backend.app.models.interview_question import InterviewQuestion
from backend.app.models.job_description import JobDescription
from backend.app.models.resume import Resume
from backend.app.models.user import User

from backend.app.schemas.interview import (
    AnswerSubmission,
    InterviewCreate,
    InterviewDetailResponse,
    InterviewResponse,
    QuestionEvaluationResponse,
)

from backend.app.services.interview_evaluator import evaluate_answer


router = APIRouter(
    prefix="/api/interviews",
    tags=["Mock Interviews"],
)


# ============================================================
# CONFIGURATION
# ============================================================

MAX_INTERVIEW_QUESTIONS = 8


# ============================================================
# ADAPTIVE DIFFICULTY ENGINE
# ============================================================

def get_adaptive_difficulty(score: int) -> str:
    """
    Select the next difficulty based on the candidate's
    latest performance.
    """

    if score >= 90:
        return "advanced"

    if score >= 75:
        return "hard"

    if score >= 55:
        return "medium"

    return "easy"


# ============================================================
# SKILL NORMALIZATION
# ============================================================

def normalize_skill(skill) -> str:
    """
    Convert different JSON skill formats into a string.
    """

    if isinstance(skill, dict):
        return str(
            skill.get("name")
            or skill.get("skill")
            or skill.get("title")
            or ""
        ).strip()

    return str(skill).strip()


def extract_required_skills(
    job_description: JobDescription,
) -> list[str]:
    """
    Extract unique required skills from the job description.
    """

    skills = job_description.required_skills or []

    result: list[str] = []

    existing = set()

    for skill in skills:

        normalized = normalize_skill(skill)

        if not normalized:
            continue

        key = normalized.lower()

        if key not in existing:
            result.append(normalized)
            existing.add(key)

    return result


# ============================================================
# SKILL PERFORMANCE ANALYSIS
# ============================================================

def get_skill_scores(
    required_skills: list[str],
    questions: list[InterviewQuestion],
) -> dict[str, list[int]]:
    """
    Map each required skill to scores from questions that
    tested that skill.
    """

    skill_scores: dict[str, list[int]] = {
        skill: []
        for skill in required_skills
    }

    for question in questions:

        if question.score is None:
            continue

        question_text = question.question.lower()

        for skill in required_skills:

            if skill.lower() in question_text:

                skill_scores[skill].append(
                    int(question.score)
                )

    return skill_scores


def choose_weakest_skill(
    required_skills: list[str],
    questions: list[InterviewQuestion],
) -> str | None:
    """
    Identify the weakest tested skill.
    """

    if not required_skills:
        return None

    skill_scores = get_skill_scores(
        required_skills,
        questions,
    )

    candidates: list[tuple[float, str]] = []

    for skill, scores in skill_scores.items():

        if scores:

            average = sum(scores) / len(scores)

            candidates.append(
                (average, skill)
            )

    if not candidates:
        return None

    candidates.sort(
        key=lambda item: item[0]
    )

    return candidates[0][1]


def choose_next_skill(
    required_skills: list[str],
    questions: list[InterviewQuestion],
) -> str | None:
    """
    Select the next skill.

    Priority:

    1. Weak skill
    2. Untested skill
    3. Weakest available skill
    """

    if not required_skills:
        return None

    skill_scores = get_skill_scores(
        required_skills,
        questions,
    )

    # --------------------------------------------------------
    # Find a weak skill first
    # --------------------------------------------------------

    weak_candidates = []

    for skill, scores in skill_scores.items():

        if scores:

            average = sum(scores) / len(scores)

            if average < 75:

                weak_candidates.append(
                    (average, skill)
                )

    if weak_candidates:

        weak_candidates.sort(
            key=lambda item: item[0]
        )

        return weak_candidates[0][1]

    # --------------------------------------------------------
    # Find an untested skill
    # --------------------------------------------------------

    for skill in required_skills:

        if not skill_scores[skill]:
            return skill

    # --------------------------------------------------------
    # Everything tested — return weakest
    # --------------------------------------------------------

    return choose_weakest_skill(
        required_skills,
        questions,
    )


# ============================================================
# CATEGORY SELECTION
# ============================================================

def choose_next_category(
    questions: list[InterviewQuestion],
) -> str:
    """
    Select the next question category according to performance.
    """

    if not questions:
        return "Technical"

    last_question = questions[-1]

    # Weak answer → deeper technical question
    if (
        last_question.score is not None
        and last_question.score < 60
    ):
        return "Technical"

    # Excellent answer → challenge the candidate
    if (
        last_question.score is not None
        and last_question.score >= 85
    ):
        return "Problem Solving"

    # Normal rotation
    categories = [
        "Technical",
        "Problem Solving",
        "Technical",
        "Resume",
    ]

    return categories[
        len(questions) % len(categories)
    ]


# ============================================================
# ADAPTIVE QUESTION GENERATOR
# ============================================================

def generate_adaptive_question(
    interview: Interview,
    job_description: JobDescription,
    questions: list[InterviewQuestion],
    next_difficulty: str,
) -> dict:
    """
    Generate a new question based on:

    - Target role
    - Required skills
    - Previous questions
    - Previous scores
    - Weak skills
    - Difficulty
    """

    required_skills = extract_required_skills(
        job_description
    )

    skill = choose_next_skill(
        required_skills,
        questions,
    )

    category = choose_next_category(
        questions
    )

    role = job_description.title

    # ========================================================
    # No skill detected
    # ========================================================

    if not skill:

        if next_difficulty == "easy":

            question_text = (
                f"What are the most important technical "
                f"concepts you would need to understand "
                f"for a {role} role?"
            )

        elif next_difficulty == "medium":

            question_text = (
                f"Describe a practical technical problem "
                f"you might face as a {role} and explain "
                f"how you would solve it."
            )

        elif next_difficulty == "hard":

            question_text = (
                f"Imagine you are working as a {role} and "
                f"a production system suddenly becomes "
                f"unreliable. Explain how you would "
                f"investigate the root cause and fix it."
            )

        else:

            question_text = (
                f"Design a production-grade solution for "
                f"a challenging technical problem that "
                f"could occur in a {role} role. Discuss "
                f"architecture, scalability, reliability, "
                f"security, monitoring, and trade-offs."
            )

        return {
            "question": question_text,
            "category": category,
        }

    # ========================================================
    # EASY
    # ========================================================

    if next_difficulty == "easy":

        question_text = (
            f"As a {role}, explain the fundamentals of "
            f"{skill}. What is it, why is it important, "
            f"and where would you use it?"
        )

    # ========================================================
    # MEDIUM
    # ========================================================

    elif next_difficulty == "medium":

        question_text = (
            f"Suppose you are working as a {role}. "
            f"Explain how you would practically use "
            f"{skill} in a project. Give a specific "
            f"example and explain your implementation "
            f"approach."
        )

    # ========================================================
    # HARD
    # ========================================================

    elif next_difficulty == "hard":

        question_text = (
            f"You are developing a production application "
            f"as a {role}. A problem related to {skill} "
            f"is causing unexpected behavior. Explain "
            f"how you would diagnose the issue, identify "
            f"the root cause, implement a solution, and "
            f"test it."
        )

    # ========================================================
    # ADVANCED
    # ========================================================

    else:

        question_text = (
            f"You are the senior engineer responsible for "
            f"a production system as a {role}. Design a "
            f"robust solution that uses {skill}. Discuss "
            f"architecture, scalability, performance, "
            f"security, failure handling, monitoring, "
            f"and important engineering trade-offs."
        )

    return {
        "question": question_text,
        "category": category,
    }


# ============================================================
# STARTER QUESTIONS
# ============================================================

def generate_starter_questions(
    interview_type: str,
    difficulty: str,
    resume: Resume,
    job_description: JobDescription,
) -> list[dict]:

    questions: list[dict] = []

    # --------------------------------------------------------
    # Question 1 — Introduction
    # --------------------------------------------------------

    questions.append(
        {
            "question": (
                "Tell me about yourself and briefly explain "
                "your technical background."
            ),
            "category": "HR",
        }
    )

    # --------------------------------------------------------
    # Question 2 — Resume
    # --------------------------------------------------------

    questions.append(
        {
            "question": (
                "Explain one of the most important projects "
                "from your resume. What problem did it solve, "
                "what technologies did you use, and what was "
                "your contribution?"
            ),
            "category": "Resume",
        }
    )

    # --------------------------------------------------------
    # Question 3 — Motivation
    # --------------------------------------------------------

    company_text = (
        f" at {job_description.company_name}"
        if job_description.company_name
        else ""
    )

    questions.append(
        {
            "question": (
                f"Why are you interested in the "
                f"{job_description.title} role"
                f"{company_text}? How does this role "
                f"match your career goals?"
            ),
            "category": "HR",
        }
    )

    # --------------------------------------------------------
    # Question 4 — Required Skill
    # --------------------------------------------------------

    required_skills = extract_required_skills(
        job_description
    )

    if required_skills:

        skill = required_skills[0]

        questions.append(
            {
                "question": (
                    f"What is your practical experience "
                    f"with {skill}? Explain how you have "
                    f"used {skill} in a project or "
                    f"real-world scenario."
                ),
                "category": "Technical",
            }
        )

    else:

        questions.append(
            {
                "question": (
                    f"What technical skills would you use "
                    f"when working as a "
                    f"{job_description.title}? Explain "
                    f"your approach with an example."
                ),
                "category": "Technical",
            }
        )

    # --------------------------------------------------------
    # Question 5 — Problem Solving
    # --------------------------------------------------------

    questions.append(
        {
            "question": (
                f"Suppose you face a challenging technical "
                f"problem while working as a "
                f"{job_description.title}. How would you "
                f"analyze the problem, debug it, design "
                f"a solution, test it, and verify the result?"
            ),
            "category": "Problem Solving",
        }
    )

    return questions[:5]


# ============================================================
# RESPONSE BUILDER
# ============================================================

def build_interview_response(
    interview: Interview,
    questions: list[InterviewQuestion],
) -> dict:

    return {
        "id": interview.id,
        "user_id": interview.user_id,
        "resume_id": interview.resume_id,
        "job_description_id": interview.job_description_id,
        "interview_type": interview.interview_type,
        "difficulty": interview.difficulty,
        "status": interview.status,
        "score": interview.score,
        "started_at": interview.started_at,
        "completed_at": interview.completed_at,
        "created_at": interview.created_at,
        "questions": questions,
    }


# ============================================================
# CREATE INTERVIEW
# ============================================================

@router.post(
    "",
    response_model=InterviewDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Resume ownership
    # --------------------------------------------------------

    resume = db.scalar(
        select(Resume).where(
            Resume.id == interview_data.resume_id,
            Resume.user_id == current_user.id,
        )
    )

    if not resume:

        raise HTTPException(
            status_code=404,
            detail="Resume not found.",
        )

    # --------------------------------------------------------
    # Job ownership
    # --------------------------------------------------------

    job_description = db.scalar(
        select(JobDescription).where(
            JobDescription.id
            == interview_data.job_description_id,
            JobDescription.user_id
            == current_user.id,
        )
    )

    if not job_description:

        raise HTTPException(
            status_code=404,
            detail="Job description not found.",
        )

    # --------------------------------------------------------
    # Interview type
    # --------------------------------------------------------

    allowed_types = {
        "hr",
        "technical",
        "mixed",
        "behavioral",
        "technical interview",
    }

    interview_type = (
        interview_data.interview_type
        .strip()
        .lower()
    )

    if interview_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid interview type. "
                "Use HR, Technical, Mixed, or Behavioral."
            ),
        )

    # --------------------------------------------------------
    # Difficulty
    # --------------------------------------------------------

    allowed_difficulties = {
        "easy",
        "medium",
        "hard",
        "advanced",
    }

    difficulty = (
        interview_data.difficulty
        .strip()
        .lower()
    )

    if difficulty not in allowed_difficulties:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid difficulty. "
                "Use Easy, Medium, Hard, or Advanced."
            ),
        )

    # --------------------------------------------------------
    # Create interview
    # --------------------------------------------------------

    interview = Interview(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description_id=job_description.id,
        interview_type=interview_type,
        difficulty=difficulty,
        status="created",
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    # --------------------------------------------------------
    # Generate starter questions
    # --------------------------------------------------------

    question_data = generate_starter_questions(
        interview_type=interview_type,
        difficulty=difficulty,
        resume=resume,
        job_description=job_description,
    )

    questions = []

    for item in question_data:

        question = InterviewQuestion(
            interview_id=interview.id,
            question=item["question"],
            category=item["category"],
        )

        db.add(question)
        questions.append(question)

    db.commit()

    for question in questions:
        db.refresh(question)

    return build_interview_response(
        interview,
        questions,
    )


# ============================================================
# GET ALL INTERVIEWS
# ============================================================

@router.get(
    "",
    response_model=list[InterviewResponse],
)
def get_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    interviews = db.scalars(
        select(Interview)
        .where(
            Interview.user_id == current_user.id
        )
        .order_by(
            Interview.created_at.desc()
        )
    ).all()

    return interviews


# ============================================================
# GET SINGLE INTERVIEW
# ============================================================

@router.get(
    "/{interview_id}",
    response_model=InterviewDetailResponse,
)
def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found.",
        )

    questions = db.scalars(
        select(InterviewQuestion)
        .where(
            InterviewQuestion.interview_id
            == interview.id
        )
        .order_by(
            InterviewQuestion.id.asc()
        )
    ).all()

    return build_interview_response(
        interview,
        questions,
    )


# ============================================================
# START INTERVIEW
# ============================================================

@router.post(
    "/{interview_id}/start",
    response_model=InterviewDetailResponse,
)
def start_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found.",
        )

    if interview.status == "completed":

        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    interview.status = "in_progress"

    if interview.started_at is None:

        interview.started_at = datetime.now(
            timezone.utc
        )

    db.commit()
    db.refresh(interview)

    questions = db.scalars(
        select(InterviewQuestion)
        .where(
            InterviewQuestion.interview_id
            == interview.id
        )
        .order_by(
            InterviewQuestion.id.asc()
        )
    ).all()

    return build_interview_response(
        interview,
        questions,
    )


# ============================================================
# SUBMIT ANSWER
# ============================================================

@router.post(
    "/{interview_id}/questions/{question_id}/answer",
    response_model=QuestionEvaluationResponse,
)
def submit_answer(
    interview_id: int,
    question_id: int,
    payload: AnswerSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Find interview
    # --------------------------------------------------------

    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found.",
        )

    # --------------------------------------------------------
    # Status check
    # --------------------------------------------------------

    if interview.status != "in_progress":

        raise HTTPException(
            status_code=400,
            detail="Interview is not currently in progress.",
        )

    # --------------------------------------------------------
    # Find question
    # --------------------------------------------------------

    question = db.scalar(
        select(InterviewQuestion).where(
            InterviewQuestion.id == question_id,
            InterviewQuestion.interview_id
            == interview_id,
        )
    )

    if not question:

        raise HTTPException(
            status_code=404,
            detail="Interview question not found.",
        )

    # --------------------------------------------------------
    # Prevent duplicate answer
    # --------------------------------------------------------

    if question.user_answer is not None:

        raise HTTPException(
            status_code=400,
            detail="This question has already been answered.",
        )

    # --------------------------------------------------------
    # Evaluate answer
    # --------------------------------------------------------

    score, feedback = evaluate_answer(
        question=question.question,
        category=question.category,
        answer=payload.answer,
    )

    # --------------------------------------------------------
    # Save answer
    # --------------------------------------------------------

    question.user_answer = payload.answer
    question.score = score
    question.feedback = feedback

    db.commit()
    db.refresh(question)

    # --------------------------------------------------------
    # Get all questions
    # --------------------------------------------------------

    questions = db.scalars(
        select(InterviewQuestion)
        .where(
            InterviewQuestion.interview_id
            == interview.id
        )
        .order_by(
            InterviewQuestion.id.asc()
        )
    ).all()

    answered_questions = [
        item
        for item in questions
        if item.score is not None
    ]

    # --------------------------------------------------------
    # Adaptive difficulty
    # --------------------------------------------------------

    next_difficulty = get_adaptive_difficulty(
        score
    )

    interview.difficulty = next_difficulty

    # --------------------------------------------------------
    # Add next adaptive question
    # --------------------------------------------------------

    if len(questions) < MAX_INTERVIEW_QUESTIONS:

        job_description = db.scalar(
            select(JobDescription).where(
                JobDescription.id
                == interview.job_description_id,
                JobDescription.user_id
                == current_user.id,
            )
        )

        if job_description:

            adaptive_data = (
                generate_adaptive_question(
                    interview=interview,
                    job_description=job_description,
                    questions=answered_questions,
                    next_difficulty=next_difficulty,
                )
            )

            adaptive_question = InterviewQuestion(
                interview_id=interview.id,
                question=adaptive_data["question"],
                category=adaptive_data["category"],
            )

            db.add(adaptive_question)

    # --------------------------------------------------------
    # Commit adaptive changes
    # --------------------------------------------------------

    db.commit()

    return {
        "question_id": question.id,
        "score": score,
        "feedback": feedback,
    }


# ============================================================
# COMPLETE INTERVIEW
# ============================================================

@router.post(
    "/{interview_id}/complete",
    response_model=InterviewDetailResponse,
)
def complete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found.",
        )

    if interview.status == "completed":

        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    questions = db.scalars(
        select(InterviewQuestion)
        .where(
            InterviewQuestion.interview_id
            == interview_id
        )
        .order_by(
            InterviewQuestion.id.asc()
        )
    ).all()

    if not questions:

        raise HTTPException(
            status_code=400,
            detail="Interview has no questions.",
        )

    unanswered_questions = [
        question
        for question in questions
        if question.user_answer is None
    ]

    if unanswered_questions:

        raise HTTPException(
            status_code=400,
            detail=(
                f"You still have "
                f"{len(unanswered_questions)} "
                f"unanswered question(s)."
            ),
        )

    scored_questions = [
        question
        for question in questions
        if question.score is not None
    ]

    if not scored_questions:

        raise HTTPException(
            status_code=400,
            detail="No evaluated answers found.",
        )

    total_score = sum(
        question.score
        for question in scored_questions
    )

    overall_score = round(
        total_score /
        len(scored_questions)
    )

    interview.score = overall_score
    interview.status = "completed"
    interview.completed_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(interview)

    return build_interview_response(
        interview,
        questions,
    )


# ============================================================
# FEEDBACK INTELLIGENCE ENGINE
# ============================================================

def generate_interview_feedback(
    questions: list[InterviewQuestion],
) -> dict:
    """
    Generate a structured interview performance report.
    """

    scored_questions = [
        question
        for question in questions
        if question.score is not None
    ]

    if not scored_questions:

        return {
            "overall_score": 0,
            "technical_score": 0,
            "problem_solving_score": 0,
            "communication_score": 0,
            "resume_score": 0,
            "strengths": [],
            "weak_areas": [],
            "recommendations": [],
            "practice_priorities": [],
        }

    # --------------------------------------------------------
    # Categorize questions
    # --------------------------------------------------------

    technical_questions = [
        q
        for q in scored_questions
        if q.category
        and q.category.lower() == "technical"
    ]

    problem_questions = [
        q
        for q in scored_questions
        if q.category
        and q.category.lower() == "problem solving"
    ]

    hr_questions = [
        q
        for q in scored_questions
        if q.category
        and q.category.lower() == "hr"
    ]

    resume_questions = [
        q
        for q in scored_questions
        if q.category
        and q.category.lower() == "resume"
    ]

    # --------------------------------------------------------
    # Average helper
    # --------------------------------------------------------

    def average_score(
        items: list[InterviewQuestion],
    ) -> int:

        if not items:
            return 0

        return round(
            sum(
                int(q.score)
                for q in items
            )
            / len(items)
        )

    # --------------------------------------------------------
    # Scores
    # --------------------------------------------------------

    overall_score = average_score(
        scored_questions
    )

    technical_score = average_score(
        technical_questions
    )

    problem_solving_score = average_score(
        problem_questions
    )

    communication_score = average_score(
        hr_questions
    )

    resume_score = average_score(
        resume_questions
    )

    # --------------------------------------------------------
    # Strengths
    # --------------------------------------------------------

    strengths: list[str] = []

    if overall_score >= 80:

        strengths.append(
            "Strong overall interview performance"
        )

    if technical_score >= 80:

        strengths.append(
            "Strong technical knowledge and fundamentals"
        )

    if problem_solving_score >= 80:

        strengths.append(
            "Good problem-solving and analytical thinking"
        )

    if communication_score >= 80:

        strengths.append(
            "Clear and confident communication"
        )

    if resume_score >= 80:

        strengths.append(
            "Strong explanation of resume projects "
            "and experience"
        )

    if not strengths:

        strengths.append(
            "Demonstrated ability to explain "
            "technical concepts"
        )

    # --------------------------------------------------------
    # Weak areas
    # --------------------------------------------------------

    weak_areas: list[str] = []

    if (
        technical_questions
        and technical_score < 60
    ):

        weak_areas.append(
            "Technical fundamentals need improvement"
        )

    if (
        problem_questions
        and problem_solving_score < 60
    ):

        weak_areas.append(
            "Problem-solving depth needs improvement"
        )

    if (
        hr_questions
        and communication_score < 60
    ):

        weak_areas.append(
            "Communication and answer structure "
            "need improvement"
        )

    if (
        resume_questions
        and resume_score < 60
    ):

        weak_areas.append(
            "Resume project explanation "
            "needs improvement"
        )

    if not weak_areas and overall_score < 75:

        weak_areas.append(
            "Overall interview consistency "
            "needs improvement"
        )

    # --------------------------------------------------------
    # Recommendations
    # --------------------------------------------------------

    recommendations: list[str] = []

    if (
        technical_questions
        and technical_score < 75
    ):

        recommendations.append(
            "Revise core technical concepts related "
            "to the target role"
        )

    if (
        problem_questions
        and problem_solving_score < 75
    ):

        recommendations.append(
            "Practice debugging and real-world "
            "technical scenarios"
        )

    if (
        hr_questions
        and communication_score < 75
    ):

        recommendations.append(
            "Practice concise and structured "
            "interview answers"
        )

    if (
        resume_questions
        and resume_score < 75
    ):

        recommendations.append(
            "Prepare deeper explanations of your "
            "projects and contributions"
        )

    if overall_score >= 80:

        recommendations.append(
            "Continue practicing advanced "
            "interview scenarios"
        )

    if not recommendations:

        recommendations.append(
            "Continue regular mock interview practice"
        )

    # --------------------------------------------------------
    # Practice priorities
    # --------------------------------------------------------

    performance = [
        (
            "Technical",
            technical_score,
        ),
        (
            "Problem Solving",
            problem_solving_score,
        ),
        (
            "Communication",
            communication_score,
        ),
        (
            "Resume & Projects",
            resume_score,
        ),
    ]

    performance = [
        item
        for item in performance
        if item[1] > 0
    ]

    performance.sort(
        key=lambda item: item[1]
    )

    practice_priorities = [
        item[0]
        for item in performance[:3]
    ]

    # --------------------------------------------------------
    # Return report
    # --------------------------------------------------------

    return {
        "overall_score": overall_score,
        "technical_score": technical_score,
        "problem_solving_score": problem_solving_score,
        "communication_score": communication_score,
        "resume_score": resume_score,
        "strengths": strengths,
        "weak_areas": weak_areas,
        "recommendations": recommendations,
        "practice_priorities": practice_priorities,
    }


# ============================================================
# INTERVIEW FEEDBACK REPORT API
# ============================================================

@router.get(
    "/{interview_id}/feedback",
)
def get_interview_feedback(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # Find interview
    # --------------------------------------------------------

    interview = db.scalar(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found.",
        )

    # --------------------------------------------------------
    # Must be completed
    # --------------------------------------------------------

    if interview.status != "completed":

        raise HTTPException(
            status_code=400,
            detail=(
                "Complete the interview before requesting "
                "the feedback report."
            ),
        )

    # --------------------------------------------------------
    # Get questions
    # --------------------------------------------------------

    questions = db.scalars(
        select(InterviewQuestion)
        .where(
            InterviewQuestion.interview_id
            == interview.id
        )
        .order_by(
            InterviewQuestion.id.asc()
        )
    ).all()

    # --------------------------------------------------------
    # Generate report
    # --------------------------------------------------------

    feedback = generate_interview_feedback(
        questions
    )

    # --------------------------------------------------------
    # Return report
    # --------------------------------------------------------

    return {
        "interview_id": interview.id,
        "interview_type": interview.interview_type,
        "difficulty": interview.difficulty,
        "status": interview.status,
        "completed_at": interview.completed_at,
        "total_questions": len(questions),
        **feedback,
    }