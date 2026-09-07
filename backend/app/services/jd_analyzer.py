import re
from typing import Any


KNOWN_SKILLS = [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C",
    "C++",
    "C#",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "SQLite",
    "FastAPI",
    "Flask",
    "Django",
    "React",
    "Node.js",
    "HTML",
    "CSS",
    "Tailwind CSS",
    "REST APIs",
    "REST API",
    "SQLAlchemy",
    "NLTK",
    "spaCy",
    "NLP",
    "Machine Learning",
    "Deep Learning",
    "Data Science",
    "Data Analytics",
    "Data Mining",
    "Git",
    "GitHub",
    "Docker",
    "AWS",
    "Azure",
    "GCP",
    "Linux",
    "Kubernetes",
    "JWT",
    "RBAC",
    "OOP",
    "Object-Oriented Programming",
    "Data Structures",
    "Algorithms",
    "DBMS",
    "Computer Networks",
]


def normalize_skill(skill: str) -> str:
    aliases = {
        "rest api": "REST APIs",
        "rest apis": "REST APIs",
        "postgres": "PostgreSQL",
        "postgresql": "PostgreSQL",
        "nodejs": "Node.js",
        "node.js": "Node.js",
        "tailwind": "Tailwind CSS",
        "tailwind css": "Tailwind CSS",
        "oop": "OOP",
        "object oriented programming":
            "Object-Oriented Programming",
        "object-oriented programming":
            "Object-Oriented Programming",
        "jwt authentication": "JWT",
        "role based access control": "RBAC",
        "role-based access control": "RBAC",
    }

    normalized = skill.strip().lower()

    return aliases.get(
        normalized,
        skill.strip(),
    )


def extract_skills(text: str) -> list[str]:
    """
    Extract known skills from text.
    """

    found_skills = []

    text_lower = text.lower()

    for skill in sorted(
        KNOWN_SKILLS,
        key=len,
        reverse=True,
    ):
        skill_lower = skill.lower()

        pattern = (
            r"(?<![a-z0-9])"
            + re.escape(skill_lower)
            + r"(?![a-z0-9])"
        )

        if re.search(
            pattern,
            text_lower,
        ):
            normalized = normalize_skill(skill)

            if normalized not in found_skills:
                found_skills.append(normalized)

    return found_skills


def extract_preferred_section(text: str) -> str:
    """
    Extract sentences containing preferred-skill language.
    """

    pattern = (
        r"[^.!?\n]*"
        r"\b(?:preferred|nice to have|good to have|bonus)\b"
        r"[^.!?\n]*(?:[.!?]|$)"
    )

    matches = re.findall(
        pattern,
        text,
        re.IGNORECASE,
    )

    sections = []

    for match in matches:
        cleaned = match.strip()
        if cleaned:
            sections.append(cleaned)

    return " ".join(sections)


def extract_required_section(text: str) -> str:
    """
    Remove sentences containing preferred-skill wording
    before extracting required skills.
    """

    pattern = (
        r"[^.!?\n]*"
        r"\b(?:preferred|nice to have|good to have|bonus)\b"
        r"[^.!?\n]*(?:[.!?]|$)"
    )

    return re.sub(
        pattern,
        " ",
        text,
        flags=re.IGNORECASE,
    )
    return required_text

def extract_experience_requirements(
    text: str,
) -> str | None:

    patterns = [
        r"\d+\+?\s*(?:years?|yrs?)"
        r"(?:\s+of)?\s+experience[^.\n]*",

        r"(?:experience|exp\.?)"
        r"\s*(?:of)?\s*"
        r"\d+\+?\s*(?:years?|yrs?)[^.\n]*",
    ]

    for pattern in patterns:
        match = re.search(
            pattern,
            text,
            re.IGNORECASE,
        )

        if match:
            return match.group(0).strip()

    return None


def extract_education_requirements(
    text: str,
) -> str | None:

    education_keywords = [
        "b.tech",
        "b.e",
        "bachelor",
        "degree",
        "computer science",
        "engineering",
        "master",
        "m.tech",
        "mca",
        "mba",
    ]

    sentences = re.split(
        r"(?<=[.!?])\s+|\n+",
        text,
    )

    matches = []

    for sentence in sentences:
        sentence_lower = sentence.lower()

        if any(
            keyword in sentence_lower
            for keyword in education_keywords
        ):
            matches.append(
                sentence.strip()
            )

    if matches:
        return " ".join(matches)

    return None


def extract_keywords(
    text: str,
    required_skills: list[str],
    preferred_skills: list[str],
) -> list[str]:

    keywords = []

    for skill in (
        required_skills
        + preferred_skills
    ):
        if skill not in keywords:
            keywords.append(skill)

    recruitment_keywords = [
        "internship",
        "intern",
        "entry level",
        "fresher",
        "graduate",
        "full stack",
        "backend",
        "frontend",
        "software developer",
        "software engineer",
        "api",
        "development",
        "testing",
        "debugging",
        "database",
        "cloud",
        "deployment",
        "agile",
    ]

    text_lower = text.lower()

    for keyword in recruitment_keywords:
        if keyword in text_lower:
            if keyword not in keywords:
                keywords.append(keyword)

    return keywords


def analyze_job_description(
    text: str,
) -> dict[str, Any]:

    preferred_text = extract_preferred_section(
        text
    )

    required_text = extract_required_section(
        text
    )

    required_skills = extract_skills(
        required_text
    )

    preferred_skills = extract_skills(
        preferred_text
    )

    # A skill identified as preferred should
    # not remain in required skills.
    required_skills = [
        skill
        for skill in required_skills
        if skill not in preferred_skills
    ]

    experience_requirements = (
        extract_experience_requirements(
            text
        )
    )

    education_requirements = (
        extract_education_requirements(
            text
        )
    )

    keywords = extract_keywords(
        text,
        required_skills,
        preferred_skills,
    )

    return {
        "required_skills":
            required_skills,

        "preferred_skills":
            preferred_skills,

        "experience_requirements":
            experience_requirements,

        "education_requirements":
            education_requirements,

        "keywords":
            keywords,
    }