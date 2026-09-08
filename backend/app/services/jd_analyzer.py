import re
from typing import Any


# ---------------------------------------------------------
# Known technical and professional skills
# ---------------------------------------------------------

KNOWN_SKILLS = [
    # Programming
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "C",
    "C++",
    "C#",

    # Data
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "SQLite",
    "Excel",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "Power BI",
    "Tableau",
    "Statistics",
    "Data Analysis",
    "Data Analytics",
    "Data Visualization",
    "Data Mining",
    "Data Science",
    "Machine Learning",
    "Deep Learning",

    # Backend
    "FastAPI",
    "Flask",
    "Django",
    "Node.js",
    "REST APIs",
    "REST API",
    "SQLAlchemy",

    # Frontend
    "React",
    "HTML",
    "CSS",
    "Tailwind CSS",

    # NLP / AI
    "NLTK",
    "spaCy",
    "NLP",
    "Natural Language Processing",

    # Development / DevOps
    "Git",
    "GitHub",
    "Docker",
    "AWS",
    "Azure",
    "GCP",
    "Linux",
    "Kubernetes",

    # Security
    "JWT",
    "RBAC",

    # Computer Science
    "OOP",
    "Object-Oriented Programming",
    "Data Structures",
    "Algorithms",
    "DBMS",
    "Computer Networks",

    # Professional / analytical skills
    "Dashboard Development",
    "Data Interpretation",
    "Trend Analysis",
    "Problem Solving",
    "Communication",
    "Business Intelligence",
    "Reporting",
]


# ---------------------------------------------------------
# Skill normalization
# ---------------------------------------------------------

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

        "data analysis": "Data Analysis",
        "data analytics": "Data Analytics",
        "data visualization": "Data Visualization",
        "natural language processing": "NLP",
        "dashboard development": "Dashboard Development",
        "data interpretation": "Data Interpretation",
        "trend analysis": "Trend Analysis",
        "problem solving": "Problem Solving",
        "business intelligence": "Business Intelligence",
    }

    normalized = skill.strip().lower()

    return aliases.get(
        normalized,
        skill.strip(),
    )


# ---------------------------------------------------------
# Skill extraction
# ---------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    """
    Extract known skills from text.

    Uses case-insensitive word-boundary matching so that
    skills such as SQL, Python, React, Power BI, etc.
    can be detected reliably.
    """

    found_skills = []

    if not text:
        return found_skills

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


# ---------------------------------------------------------
# Preferred section extraction
# ---------------------------------------------------------

def extract_preferred_section(text: str) -> str:
    """
    Extract sentences containing preferred-skill language.
    """

    if not text:
        return ""

    pattern = (
        r"[^.!?\n]*"
        r"\b(?:preferred|nice to have|good to have|bonus|"
        r"preferred skills|nice-to-have)\b"
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


# ---------------------------------------------------------
# Required section extraction
# ---------------------------------------------------------

def extract_required_section(text: str) -> str:
    """
    Remove sentences containing preferred-skill wording
    before extracting required skills.
    """

    if not text:
        return ""

    pattern = (
        r"[^.!?\n]*"
        r"\b(?:preferred|nice to have|good to have|bonus|"
        r"preferred skills|nice-to-have)\b"
        r"[^.!?\n]*(?:[.!?]|$)"
    )

    return re.sub(
        pattern,
        " ",
        text,
        flags=re.IGNORECASE,
    )


# ---------------------------------------------------------
# Experience extraction
# ---------------------------------------------------------

def extract_experience_requirements(
    text: str,
) -> str | None:

    if not text:
        return None

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


# ---------------------------------------------------------
# Education extraction
# ---------------------------------------------------------

def extract_education_requirements(
    text: str,
) -> str | None:

    if not text:
        return None

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
            cleaned = sentence.strip()

            if cleaned:
                matches.append(cleaned)

    if matches:
        return " ".join(matches)

    return None


# ---------------------------------------------------------
# Context-based professional skill extraction
# ---------------------------------------------------------

def extract_contextual_skills(text: str) -> list[str]:
    """
    Detect common job requirements that may not appear as
    exact technology names.

    This is especially useful for roles such as Data Analyst,
    Business Analyst, Product Analyst, etc.
    """

    if not text:
        return []

    text_lower = text.lower()

    contextual_patterns = {
        "Dashboard Development": [
            "dashboard",
            "dashboards",
            "dashboard creation",
            "dashboard development",
        ],

        "Data Analysis": [
            "data analysis",
            "analyze data",
            "analysing data",
            "analyzing data",
            "analyze datasets",
            "analyzing datasets",
        ],

        "Data Interpretation": [
            "interpret data",
            "data interpretation",
            "meaningful insights",
            "derive insights",
            "generate insights",
        ],

        "Trend Analysis": [
            "trend analysis",
            "analyzing trends",
            "analyse trends",
            "analyze trends",
            "identify trends",
        ],

        "Data Visualization": [
            "data visualization",
            "data visualisation",
            "visualize data",
            "visualise data",
            "visualization",
            "visualisation",
        ],

        "Business Intelligence": [
            "business intelligence",
            "business decisions",
            "business decision",
            "decision making",
            "decision-making",
        ],

        "Reporting": [
            "reporting",
            "reports",
            "generate reports",
            "business reports",
        ],

        "Communication": [
            "communicating findings",
            "communication skills",
            "communicate findings",
            "communicate insights",
            "stakeholder communication",
        ],

        "Problem Solving": [
            "problem solving",
            "problem-solving",
            "solve problems",
            "analytical problem solving",
        ],
    }

    found = []

    for skill, patterns in contextual_patterns.items():
        for pattern in patterns:
            if pattern in text_lower:
                if skill not in found:
                    found.append(skill)

                break

    return found


# ---------------------------------------------------------
# Keywords
# ---------------------------------------------------------

def extract_keywords(
    text: str,
    required_skills: list[str],
    preferred_skills: list[str],
) -> list[str]:

    keywords = []

    # Skills are also useful search/matching keywords.
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
        "data analyst",
        "business analyst",
        "api",
        "development",
        "testing",
        "debugging",
        "database",
        "datasets",
        "structured datasets",
        "data",
        "analytics",
        "dashboard",
        "dashboards",
        "trends",
        "insights",
        "stakeholders",
        "communication",
        "reporting",
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


# ---------------------------------------------------------
# Main JD analyzer
# ---------------------------------------------------------

def analyze_job_description(
    text: str,
) -> dict[str, Any]:
    """
    Analyze a job description and extract:

    - required skills
    - preferred skills
    - experience requirements
    - education requirements
    - keywords
    """

    if not text or not text.strip():
        return {
            "required_skills": [],
            "preferred_skills": [],
            "experience_requirements": None,
            "education_requirements": None,
            "keywords": [],
        }

    preferred_text = extract_preferred_section(
        text
    )

    required_text = extract_required_section(
        text
    )

    # Exact known technical/professional skills.
    required_skills = extract_skills(
        required_text
    )

    preferred_skills = extract_skills(
        preferred_text
    )

    # Add contextual skills such as dashboard development,
    # trend analysis, communication, etc.
    contextual_required = extract_contextual_skills(
        required_text
    )

    contextual_preferred = extract_contextual_skills(
        preferred_text
    )

    for skill in contextual_required:
        if skill not in required_skills:
            required_skills.append(skill)

    for skill in contextual_preferred:
        if skill not in preferred_skills:
            preferred_skills.append(skill)

    # A skill identified as preferred should not remain
    # in required skills.
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