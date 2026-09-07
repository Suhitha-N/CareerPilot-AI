import re
from typing import Any


SECTION_NAMES = {
    "summary": [
        "professional summary",
        "career summary",
        "summary",
        "profile",
        "objective",
    ],
    "skills": [
        "technical skills",
        "technical skill",
        "skills",
        "technical expertise",
        "skill set",
    ],
    "projects": [
        "projects",
        "project",
        "academic projects",
        "academic project",
        "personal projects",
        "personal project",
    ],
    "experience": [
        "internship experience",
        "internship",
        "work experience",
        "professional experience",
        "experience",
    ],
    "education": [
        "education",
        "educational background",
        "academic background",
    ],
    "certifications": [
        "certifications",
        "certificates",
        "certification",
    ],
    "achievements": [
        "achievements",
        "accomplishments",
    ],
}


KNOWN_TECHNOLOGIES = [
    "JavaScript",
    "TypeScript",
    "PostgreSQL",
    "SQLAlchemy",
    "Node.js",
    "REST APIs",
    "FastAPI",
    "Python",
    "Java",
    "Flask",
    "Django",
    "React",
    "MySQL",
    "SQLite",
    "MongoDB",
    "HTML5",
    "HTML",
    "CSS3",
    "CSS",
    "NLTK",
    "spaCy",
    "NLP",
    "GitHub",
    "Git",
    "VS Code",
    "SQL",
]


BULLET_PREFIXES = (
    "•",
    "-",
    "–",
    "—",
    "▪",
    "◦",
    "·",
    "*",
)


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(text: str) -> str:

    replacements = {
        "F rontend": "Frontend",
        "B ackend": "Backend",
        "D atabases": "Databases",
        "L anguages": "Languages",
        "T ools": "Tools",
        "C oncepts": "Concepts",
        "T echnical": "Technical",
        "E xperience": "Experience",
        "P rojects": "Projects",
        "E ducation": "Education",
        "C ertifications": "Certifications",
        "A chievements": "Achievements",
        "S kills": "Skills",

        "F AQ": "FAQ",
        "W elcome": "Welcome",

        "C GP A": "CGPA",
        "C G P A": "CGPA",

        "B.T ech": "B.Tech",
        "B. Tech": "B.Tech",

        "Servi- ceNow": "ServiceNow",

        "real-worldproblems": "real-world problems",
        "real-worldproblems.": "real-world problems.",

        "validateddatasets": "validated datasets",
        "exception handling,and": "exception handling, and",
        "problemsonHackerRank": "problems on HackerRank",
        "Solved100+": "Solved 100+",
        "theHackerRank": "the HackerRank",
        "Earned theHackerRank": "Earned the HackerRank",

        "usingFastAPI": "using FastAPI",
        "usingFlask": "using Flask",
        "andPostgreSQL": "and PostgreSQL",
        "andspaCy": "and spaCy",
        "andNLTK": "and NLTK",
        "usingPython": "using Python",
        "usingSQL": "using SQL",

        "FastAPI,Flask": "FastAPI, Flask",
        "Flask,SQLite": "Flask, SQLite",
        "SQLite,NLTK": "SQLite, NLTK",
        "NLTK, and": "NLTK, and",
        "andREST": "and REST",
        "usingFastAPI,": "using FastAPI,",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # -----------------------------------------------------
    # Repair PDF technology spacing
    # -----------------------------------------------------

    # Postgre SQL -> PostgreSQL
    text = re.sub(
        r"(?i)\bPostgre\s+SQL\b",
        "PostgreSQL",
        text,
    )

    # My SQL -> MySQL
    text = re.sub(
        r"(?i)\bMy\s+SQL\b",
        "MySQL",
        text,
    )

    # SQL Alchemy -> SQLAlchemy
    text = re.sub(
        r"(?i)\bSQL\s+Alchemy\b",
        "SQLAlchemy",
        text,
    )

    # Node .js -> Node.js
    text = re.sub(
        r"(?i)\bNode\s*\.\s*js\b",
        "Node.js",
        text,
    )

    # -----------------------------------------------------
    # Repair technology attached to previous word
    # -----------------------------------------------------

    technology_names = sorted(
        KNOWN_TECHNOLOGIES,
        key=len,
        reverse=True,
    )

    for technology in technology_names:

        pattern = re.compile(
            rf"(?i)(?<![\s,/-])"
            rf"([A-Za-z])"
            rf"({re.escape(technology)})"
            rf"(?=[,\s]|$)"
        )

        text = pattern.sub(
            r"\1 \2",
            text,
        )

    # -----------------------------------------------------
    # General cleanup
    # -----------------------------------------------------

    text = re.sub(
        r"(?m)^(\s*):\s*",
        r"\1",
        text,
    )

    text = re.sub(
        r"\bT echnical\b",
        "Technical",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bE xperience\b",
        "Experience",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bP rojects\b",
        "Projects",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bE ducation\b",
        "Education",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bS kills\b",
        "Skills",
        text,
        flags=re.IGNORECASE,
    )

    # Repair words broken by hyphen + spaces
    text = re.sub(
        r"(\w)-\s+(\w)",
        r"\1\2",
        text,
    )

    # Normalize dash characters
    text = text.replace("–", "-")
    text = text.replace("—", "-")
    text = text.replace("▪", "-")
    text = text.replace("◦", "-")
    text = text.replace("·", "-")

    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    return text.strip()


# =========================================================
# LINE HELPERS
# =========================================================

def clean_line(line: str) -> str:

    line = line.strip()

    line = line.lstrip(
        "•-–—▪◦·* "
    ).strip()

    line = line.lstrip(":").strip()

    return line


def is_bullet_line(line: str) -> bool:

    return line.strip().startswith(
        BULLET_PREFIXES
    )


# =========================================================
# SECTION DETECTION
# =========================================================

def get_section_lookup() -> dict[str, str]:

    lookup = {}

    for category, names in SECTION_NAMES.items():

        for name in names:

            normalized = re.sub(
                r"[^a-z0-9 ]",
                "",
                name.lower(),
            )

            lookup[normalized] = category

    return lookup


def normalize_section_heading(line: str) -> str:

    normalized = line.lower().strip()

    normalized = re.sub(
        r"[:\-]+$",
        "",
        normalized,
    )

    normalized = re.sub(
        r"[^a-z0-9 ]",
        "",
        normalized,
    )

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    return normalized.strip()


def extract_sections(
    text: str,
) -> dict[str, str]:

    text = normalize_text(text)

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    section_lookup = get_section_lookup()

    sections: dict[str, list[str]] = {}

    current_section = None

    for line in lines:

        heading = normalize_section_heading(
            line
        )

        if heading in section_lookup:

            current_section = section_lookup[
                heading
            ]

            if current_section not in sections:
                sections[current_section] = []

            continue

        if current_section:
            sections[current_section].append(
                line
            )

    return {
        section: "\n".join(content).strip()
        for section, content in sections.items()
    }


# =========================================================
# SKILLS
# =========================================================

def extract_skills(
    skills_text: str,
) -> dict[str, list[str]]:

    skills: dict[str, list[str]] = {}

    category_pattern = re.compile(
        r"^(Languages|Frontend|Backend|Databases|"
        r"Libraries|Tools|Concepts)"
        r"\s*:?\s*(.*)$",
        re.IGNORECASE,
    )

    for line in skills_text.splitlines():

        line = line.strip()

        if not line:
            continue

        match = category_pattern.match(line)

        if not match:
            continue

        category = match.group(1).lower()

        values = match.group(2).strip()

        values = values.lstrip(":").strip()

        if not values:
            continue

        skill_values = []

        for item in values.split(","):

            cleaned = item.strip()

            cleaned = cleaned.lstrip(":").strip()

            # Final technology normalization
            cleaned = re.sub(
                r"(?i)^Postgre\s+SQL$",
                "PostgreSQL",
                cleaned,
            )

            cleaned = re.sub(
                r"(?i)^My\s+SQL$",
                "MySQL",
                cleaned,
            )

            cleaned = re.sub(
                r"(?i)^SQL\s+Alchemy$",
                "SQLAlchemy",
                cleaned,
            )

            if cleaned:
                skill_values.append(
                    cleaned
                )

        if skill_values:

            # Remove duplicates while preserving order
            skills[category] = list(
                dict.fromkeys(
                    skill_values
                )
            )

    return skills


# =========================================================
# TECHNOLOGY PATTERN
# =========================================================

def get_technology_pattern() -> re.Pattern:

    technologies = sorted(
        KNOWN_TECHNOLOGIES,
        key=len,
        reverse=True,
    )

    pattern = "|".join(
        re.escape(technology)
        for technology in technologies
    )

    return re.compile(
        rf"(?i)\b({pattern})\b"
    )


# =========================================================
# PROJECTS
# =========================================================

def split_project_heading(
    line: str,
) -> tuple[str, list[str]]:

    line = clean_line(line)

    line = re.sub(
        r"\s+",
        " ",
        line,
    ).strip()

    technology_pattern = (
        get_technology_pattern()
    )

    # -----------------------------------------------------
    # Separator-based heading
    # -----------------------------------------------------

    parts = [
        part.strip()
        for part in re.split(
            r"\s*[-]\s*",
            line,
        )
        if part.strip()
    ]

    if len(parts) > 1:

        project_name = parts[0]

        technology_text = " ".join(
            parts[1:]
        )

        technologies = (
            technology_pattern.findall(
                technology_text
            )
        )

        if technologies:

            return (
                project_name,
                list(
                    dict.fromkeys(
                        technologies
                    )
                ),
            )

        return (
            project_name,
            parts[1:],
        )

    # -----------------------------------------------------
    # Technology attached to project name
    # -----------------------------------------------------

    matches = list(
        technology_pattern.finditer(line)
    )

    if matches:

        first_match = matches[0]

        project_name = line[
            :first_match.start()
        ].strip()

        technology_text = line[
            first_match.start():
        ].strip()

        technologies = (
            technology_pattern.findall(
                technology_text
            )
        )

        if project_name and technologies:

            return (
                project_name,
                list(
                    dict.fromkeys(
                        technologies
                    )
                ),
            )

    return line, []


def looks_like_project_heading(
    line: str,
) -> bool:

    if is_bullet_line(line):
        return False

    cleaned = clean_line(line)

    if not cleaned:
        return False

    if " - " in cleaned:
        return True

    technology_pattern = (
        get_technology_pattern()
    )

    return bool(
        technology_pattern.search(
            cleaned
        )
    )


def extract_projects(
    projects_text: str,
) -> list[dict[str, Any]]:

    lines = [
        line.strip()
        for line in projects_text.splitlines()
        if line.strip()
    ]

    projects = []

    current_project = None

    for line in lines:

        if looks_like_project_heading(
            line
        ):

            if current_project:
                projects.append(
                    current_project
                )

            name, technologies = (
                split_project_heading(
                    line
                )
            )

            current_project = {
                "name": name,
                "technologies": technologies,
                "description": [],
            }

            continue

        if current_project:

            description = clean_line(
                line
            )

            if description:

                current_project[
                    "description"
                ].append(
                    description
                )

    if current_project:

        projects.append(
            current_project
        )

    return projects


# =========================================================
# EXPERIENCE
# =========================================================

def extract_experience(
    experience_text: str,
) -> list[dict[str, Any]]:

    lines = [
        line.strip()
        for line in experience_text.splitlines()
        if line.strip()
    ]

    experiences = []

    current_experience = None

    month_pattern = (
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|"
        r"Sep|Oct|Nov|Dec)"
    )

    date_pattern = (
        month_pattern
        + r"\s+\d{4}"
    )

    range_pattern = (
        date_pattern
        + r"\s*[-]\s*"
        + date_pattern
    )

    for line in lines:

        cleaned_line = clean_line(
            line
        )

        if not cleaned_line:
            continue

        # -------------------------------------------------
        # Detect experience heading
        # -------------------------------------------------

        is_experience_heading = (
            not is_bullet_line(line)
            and re.search(
                r"\b("
                r"Intern|"
                r"Internship|"
                r"Developer|"
                r"Engineer|"
                r"Trainee|"
                r"Associate"
                r")\b",
                cleaned_line,
                re.IGNORECASE,
            )
        )

        if is_experience_heading:

            if current_experience:
                experiences.append(
                    current_experience
                )

            duration = ""

            remaining = cleaned_line

            # -------------------------------------------------
            # Date range
            # -------------------------------------------------

            range_match = re.search(
                range_pattern,
                remaining,
                re.IGNORECASE,
            )

            if range_match:

                duration = (
                    range_match.group(0)
                )

                remaining = (
                    remaining[
                        :range_match.start()
                    ]
                    + remaining[
                        range_match.end():
                    ]
                ).strip()

            else:

                # -------------------------------------------------
                # One or more individual dates
                # -------------------------------------------------

                date_matches = list(
                    re.finditer(
                        date_pattern,
                        remaining,
                        re.IGNORECASE,
                    )
                )

                if date_matches:

                    if len(date_matches) >= 2:

                        duration = (
                            date_matches[0].group(0)
                            + " - "
                            + date_matches[1].group(0)
                        )

                        start = (
                            date_matches[0].start()
                        )

                        end = (
                            date_matches[1].end()
                        )

                        remaining = (
                            remaining[:start]
                            + remaining[end:]
                        ).strip()

                    else:

                        duration = (
                            date_matches[0].group(0)
                        )

                        remaining = (
                            remaining[
                                :date_matches[0].start()
                            ]
                            + remaining[
                                date_matches[0].end():
                            ]
                        ).strip()

            # -------------------------------------------------
            # Remove extra separators
            # -------------------------------------------------

            remaining = re.sub(
                r"\s*[-|]\s*$",
                "",
                remaining,
            ).strip()

            title = remaining
            organization = ""

            # -------------------------------------------------
            # Title - Organization
            # -------------------------------------------------

            if " - " in remaining:

                title_parts = remaining.split(
                    " - ",
                    1,
                )

                title = title_parts[0].strip()

                organization = (
                    title_parts[1].strip()
                )

            current_experience = {
                "title": title,
                "duration": duration,
                "organization": organization,
                "description": [],
            }

            continue

        # -------------------------------------------------
        # Experience details
        # -------------------------------------------------

        if current_experience:

            if is_bullet_line(line):

                description = clean_line(
                    line
                )

                if description:

                    current_experience[
                        "description"
                    ].append(
                        description
                    )

            elif not current_experience[
                "organization"
            ]:

                current_experience[
                    "organization"
                ] = cleaned_line

            else:

                current_experience[
                    "description"
                ].append(
                    cleaned_line
                )

    if current_experience:

        experiences.append(
            current_experience
        )

    return experiences


# =========================================================
# MAIN ANALYZER
# =========================================================

def analyze_resume(
    text: str,
) -> dict[str, Any]:

    normalized_text = normalize_text(
        text
    )

    sections = extract_sections(
        normalized_text
    )

    skills = extract_skills(
        sections.get(
            "skills",
            "",
        )
    )

    projects = extract_projects(
        sections.get(
            "projects",
            "",
        )
    )

    experience = extract_experience(
        sections.get(
            "experience",
            "",
        )
    )

    return {
        "summary": sections.get(
            "summary",
            "",
        ),

        "skills": skills,

        "projects": projects,

        "experience": experience,

        "education": sections.get(
            "education",
            "",
        ),

        "certifications": sections.get(
            "certifications",
            "",
        ),

        "achievements": sections.get(
            "achievements",
            "",
        ),
    }