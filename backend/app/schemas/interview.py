from datetime import datetime

from pydantic import BaseModel, Field


class InterviewCreate(BaseModel):
    resume_id: int = Field(gt=0)
    job_description_id: int = Field(gt=0)
    interview_type: str = Field(min_length=2, max_length=50)
    difficulty: str = Field(min_length=2, max_length=30)


class InterviewQuestionResponse(BaseModel):
    id: int
    interview_id: int
    question: str
    category: str
    expected_answer: str | None = None
    user_answer: str | None = None
    score: int | None = None
    feedback: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    resume_id: int
    job_description_id: int
    interview_type: str
    difficulty: str
    status: str
    score: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewDetailResponse(InterviewResponse):
    questions: list[InterviewQuestionResponse] = []


class AnswerSubmission(BaseModel):
    answer: str = Field(min_length=1, max_length=5000)


class QuestionEvaluationResponse(BaseModel):
    question_id: int
    score: int
    feedback: str