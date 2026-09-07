from typing import Any


def normalize_skill_name(skill: str) -> str:
    """Normalize skill names for consistent comparison."""

    aliases = {
        "postgres": "postgresql",
        "postgres sql": "postgresql",
        "rest api": "rest apis",
        "restful api": "rest apis",
        "restful apis": "rest apis",
        "nodejs": "node.js",
        "node js": "node.js",
        "object oriented programming": "oop",
        "object-oriented programming": "oop",
    }

    value = skill.strip().lower()

    return aliases.get(value, value)


def classify_skill_gap(
    skill: str,
    is_required: bool,
) -> str:
    """
    Classify the importance of a missing skill.

    Required skills are treated as critical.
    Preferred skills are treated as optional.
    """

    if is_required:
        return "critical"

    return "optional"


def get_learning_priority(category: str) -> str:
    """Convert a gap category into a learning priority."""

    priority_map = {
        "critical": "high",
        "important": "medium",
        "optional": "low",
    }

    return priority_map.get(category, "medium")


def generate_learning_action(skill: str) -> str:
    """Generate a practical learning action for a skill."""

    skill_lower = normalize_skill_name(skill)

    learning_actions = {
        "docker": (
            "Learn Docker fundamentals, Dockerfiles, Docker Compose, "
            "and containerize a FastAPI application."
        ),
        "aws": (
            "Learn AWS fundamentals, IAM, EC2, S3, and deploy "
            "a backend application on AWS."
        ),
        "react": (
            "Learn React fundamentals, components, props, state, "
            "hooks, and build a small frontend application."
        ),
        "kubernetes": (
            "Learn Kubernetes fundamentals, pods, deployments, "
            "services, and basic container orchestration."
        ),
        "machine learning": (
            "Learn supervised and unsupervised learning, model "
            "training, evaluation, and practical ML projects."
        ),
        "deep learning": (
            "Learn neural networks, backpropagation, CNNs, "
            "and practical deep learning workflows."
        ),
        "typescript": (
            "Learn TypeScript types, interfaces, generics, "
            "and apply TypeScript to a React project."
        ),
        "git": (
            "Practice Git branching, merging, pull requests, "
            "rebasing, and collaborative workflows."
        ),
        "linux": (
            "Learn Linux commands, permissions, processes, "
            "shell scripting, and server administration basics."
        ),
    }

    return learning_actions.get(
        skill_lower,
        f"Learn {skill}, practice it with hands-on exercises, "
        f"and build a small project demonstrating practical usage.",
    )


def build_skill_gap(
    missing_skills: list[str],
    preferred_missing_skills: list[str],
) -> list[dict[str, Any]]:
    """Build structured skill-gap information."""

    gaps = []

    seen = set()

    for skill in missing_skills:
        normalized = normalize_skill_name(skill)

        if normalized in seen:
            continue

        seen.add(normalized)

        category = classify_skill_gap(
            skill,
            is_required=True,
        )

        gaps.append(
            {
                "skill": skill,
                "category": category,
                "priority": get_learning_priority(category),
                "reason": "This skill is required by the job but is missing from the resume.",
                "learning_action": generate_learning_action(skill),
            }
        )

    for skill in preferred_missing_skills:
        normalized = normalize_skill_name(skill)

        if normalized in seen:
            continue

        seen.add(normalized)

        category = classify_skill_gap(
            skill,
            is_required=False,
        )

        gaps.append(
            {
                "skill": skill,
                "category": category,
                "priority": get_learning_priority(category),
                "reason": "This skill is preferred by the employer but is missing from the resume.",
                "learning_action": generate_learning_action(skill),
            }
        )

    return gaps


def generate_skill_gap_summary(
    skill_gaps: list[dict[str, Any]],
) -> str:
    """Generate a concise summary of the skill gaps."""

    critical_count = sum(
        1
        for gap in skill_gaps
        if gap["category"] == "critical"
    )

    optional_count = sum(
        1
        for gap in skill_gaps
        if gap["category"] == "optional"
    )

    if not skill_gaps:
        return (
            "No major skill gaps were identified. "
            "Your resume covers the skills identified in the job description."
        )

    if critical_count > 0:
        return (
            f"You have {critical_count} critical required skill gap(s) "
            f"and {optional_count} preferred skill gap(s). "
            "Focus on the critical skills first to improve your job readiness."
        )

    return (
        f"You have {optional_count} preferred skill gap(s). "
        "Your required skills are currently covered."
    )


def analyze_skill_gaps(
    match_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate a structured skill-gap analysis from the
    existing resume-to-job matching result.
    """

    missing_skills = match_result.get("missing_skills") or []
    preferred_missing_skills = (
        match_result.get("preferred_missing_skills") or []
    )

    skill_gaps = build_skill_gap(
        missing_skills,
        preferred_missing_skills,
    )

    critical_gaps = [
        gap
        for gap in skill_gaps
        if gap["category"] == "critical"
    ]

    important_gaps = [
        gap
        for gap in skill_gaps
        if gap["category"] == "important"
    ]

    optional_gaps = [
        gap
        for gap in skill_gaps
        if gap["category"] == "optional"
    ]

    summary = generate_skill_gap_summary(skill_gaps)

    return {
        "total_gaps": len(skill_gaps),
        "critical_gap_count": len(critical_gaps),
        "important_gap_count": len(important_gaps),
        "optional_gap_count": len(optional_gaps),
        "skill_gaps": skill_gaps,
        "summary": summary,
    }