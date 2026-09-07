from typing import Any


def normalize_skill(skill: str) -> str:
    """
    Normalize skill names before comparison.
    """

    aliases = {
        "python": "python",
        "java": "java",
        "javascript": "javascript",
        "typescript": "typescript",
        "sql": "sql",
        "postgres": "postgresql",
        "postgresql": "postgresql",
        "mysql": "mysql",
        "mongodb": "mongodb",
        "sqlite": "sqlite",
        "fastapi": "fastapi",
        "flask": "flask",
        "django": "django",
        "react": "react",
        "node.js": "node.js",
        "nodejs": "node.js",
        "rest api": "rest apis",
        "rest apis": "rest apis",
        "sqlalchemy": "sqlalchemy",
        "nltk": "nltk",
        "spacy": "spacy",
        "nlp": "nlp",
        "machine learning": "machine learning",
        "deep learning": "deep learning",
        "data science": "data science",
        "data analytics": "data analytics",
        "data mining": "data mining",
        "git": "git",
        "github": "github",
        "docker": "docker",
        "aws": "aws",
        "azure": "azure",
        "gcp": "gcp",
        "linux": "linux",
        "kubernetes": "kubernetes",
        "jwt": "jwt",
        "rbac": "rbac",
        "oop": "oop",
        "object-oriented programming":
            "object-oriented programming",
        "object oriented programming":
            "object-oriented programming",
        "data structures": "data structures",
        "algorithms": "algorithms",
        "dbms": "dbms",
        "computer networks": "computer networks",
    }

    value = skill.strip().lower()

    return aliases.get(value, value)


def flatten_resume_skills(
    skills: dict[str, Any] | None,
) -> list[str]:
    """
    Convert the structured resume skill dictionary
    into a single skill list.
    """

    if not isinstance(skills, dict):
        return []

    result = []

    for skill_group in skills.values():

        if not isinstance(skill_group, list):
            continue

        for skill in skill_group:

            if not isinstance(skill, str):
                continue

            cleaned = skill.strip()

            if cleaned:
                result.append(cleaned)

    return result


def calculate_skill_match(
    resume_skills: list[str],
    jd_skills: list[str],
) -> dict[str, Any]:
    """
    Compare resume skills against JD skills.
    """

    resume_map = {
        normalize_skill(skill): skill
        for skill in resume_skills
    }

    jd_map = {
        normalize_skill(skill): skill
        for skill in jd_skills
    }

    matched = []
    missing = []

    for normalized_skill, original_skill in jd_map.items():

        if normalized_skill in resume_map:

            matched.append(
                original_skill
            )

        else:

            missing.append(
                original_skill
            )

    total_required = len(jd_map)
    matched_count = len(matched)

    if total_required > 0:
        skill_score = round(
            (matched_count / total_required) * 100
        )
    else:
        skill_score = 0

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_match_score": skill_score,
    }


def generate_recommendations(
    missing_skills: list[str],
) -> list[str]:
    """
    Generate actionable recommendations
    based on missing JD skills.
    """

    recommendations = []

    if not missing_skills:
        recommendations.append(
            "Your resume covers the identified job skills well."
        )

        return recommendations

    for skill in missing_skills[:5]:

        recommendations.append(
            f"Consider learning or strengthening {skill}."
        )

    recommendations.append(
        "Add relevant missing skills to your resume "
        "only after gaining practical experience."
    )

    return recommendations


def calculate_job_match(
    resume_profile: dict[str, Any],
    jd_analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Calculate overall resume-to-job match.
    """

    resume_skills = flatten_resume_skills(
        resume_profile.get("skills")
    )

    required_skills = jd_analysis.get(
        "required_skills"
    ) or []

    preferred_skills = jd_analysis.get(
        "preferred_skills"
    ) or []

    required_result = calculate_skill_match(
        resume_skills,
        required_skills,
    )

    preferred_result = calculate_skill_match(
        resume_skills,
        preferred_skills,
    )

    required_score = required_result[
        "skill_match_score"
    ]

    preferred_score = preferred_result[
        "skill_match_score"
    ]

    if preferred_skills:
        overall_score = round(
            (required_score * 0.8)
            + (preferred_score * 0.2)
        )
    else:
        overall_score = required_score

    recommendations = generate_recommendations(
        required_result["missing_skills"]
    )

    return {
        "overall_match_score": overall_score,
        "required_skill_match_score":
            required_score,
        "preferred_skill_match_score":
            preferred_score,
        "matched_skills":
            required_result["matched_skills"],
        "missing_skills":
            required_result["missing_skills"],
        "preferred_matched_skills":
            preferred_result["matched_skills"],
        "preferred_missing_skills":
            preferred_result["missing_skills"],
        "recommendations":
            recommendations,
    }