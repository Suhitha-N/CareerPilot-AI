from pydantic import BaseModel, Field


class JobDescriptionCreate(BaseModel):
    title: str = Field(
        min_length=2,
        max_length=255,
    )

    company_name: str | None = Field(
        default=None,
        max_length=255,
    )

    description_text: str = Field(
        min_length=20,
    )


class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    company_name: str | None
    description_text: str
    required_skills: list
    preferred_skills: list
    experience_requirements: str | None
    education_requirements: str | None
    keywords: list

    class Config:
        from_attributes = True