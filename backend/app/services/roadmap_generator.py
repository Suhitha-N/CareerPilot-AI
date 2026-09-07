from typing import Any


ROADMAP_DATA: dict[str, dict[str, Any]] = {
    "docker": {
        "title": "Docker & Containerization",
        "duration": "1-2 weeks",
        "topics": [
            "Docker fundamentals",
            "Images and containers",
            "Dockerfile",
            "Docker Compose",
            "Container networking",
            "Volumes and environment variables",
        ],
        "project": "Containerize a FastAPI + PostgreSQL application using Docker Compose.",
        "milestone": "Build and run your backend application completely inside Docker containers.",
    },
    "aws": {
        "title": "AWS Cloud Fundamentals",
        "duration": "2-3 weeks",
        "topics": [
            "AWS fundamentals",
            "IAM",
            "EC2",
            "S3",
            "Cloud deployment basics",
            "Application monitoring",
        ],
        "project": "Deploy a FastAPI backend on an AWS EC2 instance.",
        "milestone": "Deploy and access a backend application from the cloud.",
    },
    "react": {
        "title": "React Frontend Development",
        "duration": "2-3 weeks",
        "topics": [
            "React fundamentals",
            "Components",
            "Props and state",
            "Hooks",
            "Forms",
            "API integration",
        ],
        "project": "Build a React dashboard that consumes a FastAPI REST API.",
        "milestone": "Build a responsive frontend connected to a backend API.",
    },
    "typescript": {
        "title": "TypeScript",
        "duration": "1-2 weeks",
        "topics": [
            "TypeScript fundamentals",
            "Types and interfaces",
            "Functions",
            "Generics",
            "Type narrowing",
            "React with TypeScript",
        ],
        "project": "Convert a small React application from JavaScript to TypeScript.",
        "milestone": "Build a type-safe React application.",
    },
    "kubernetes": {
        "title": "Kubernetes Fundamentals",
        "duration": "2-3 weeks",
        "topics": [
            "Containers and orchestration",
            "Pods",
            "Deployments",
            "Services",
            "ConfigMaps and Secrets",
            "Basic Kubernetes networking",
        ],
        "project": "Deploy a containerized FastAPI application to a local Kubernetes cluster.",
        "milestone": "Deploy and manage a multi-container application using Kubernetes.",
    },
    "machine learning": {
        "title": "Machine Learning Fundamentals",
        "duration": "3-4 weeks",
        "topics": [
            "Supervised learning",
            "Unsupervised learning",
            "Feature engineering",
            "Model training",
            "Model evaluation",
            "Overfitting and regularization",
        ],
        "project": "Build a machine-learning model and expose predictions through a FastAPI API.",
        "milestone": "Train, evaluate, and deploy a basic machine-learning model.",
    },
    "deep learning": {
        "title": "Deep Learning Fundamentals",
        "duration": "3-4 weeks",
        "topics": [
            "Neural networks",
            "Activation functions",
            "Backpropagation",
            "Optimization",
            "CNN fundamentals",
            "Model evaluation",
        ],
        "project": "Build an image-classification model and expose it through an API.",
        "milestone": "Train and serve a basic deep-learning model.",
    },
    "git": {
        "title": "Advanced Git & Collaboration",
        "duration": "1 week",
        "topics": [
            "Branching",
            "Merging",
            "Rebasing",
            "Pull requests",
            "Conflict resolution",
            "Collaborative workflows",
        ],
        "project": "Contribute a feature to a multi-branch Git project using pull requests.",
        "milestone": "Use Git confidently in a collaborative software-development workflow.",
    },
    "linux": {
        "title": "Linux Fundamentals",
        "duration": "1-2 weeks",
        "topics": [
            "Linux commands",
            "File permissions",
            "Processes",
            "Package management",
            "Shell scripting",
            "Server administration",
        ],
        "project": "Configure a Linux server and deploy a small backend application.",
        "milestone": "Manage a Linux environment and deploy an application.",
    },
}


def normalize_skill(skill: str) -> str:
    """Normalize skill names for roadmap lookup."""

    aliases = {
        "postgres": "postgresql",
        "rest api": "rest apis",
        "restful api": "rest apis",
        "nodejs": "node.js",
        "node js": "node.js",
        "object oriented programming": "oop",
        "object-oriented programming": "oop",
    }

    value = skill.strip().lower()

    return aliases.get(value, value)


def create_generic_roadmap(skill: str) -> dict[str, Any]:
    """Create a fallback roadmap for an unknown skill."""

    return {
        "title": f"{skill} Skill Development",
        "duration": "1-2 weeks",
        "topics": [
            f"{skill} fundamentals",
            f"Core concepts of {skill}",
            f"Practical usage of {skill}",
            f"Common tools and workflows for {skill}",
            f"Best practices for {skill}",
        ],
        "project": (
            f"Build a small practical project demonstrating "
            f"your knowledge of {skill}."
        ),
        "milestone": (
            f"Complete a practical project using {skill} "
            "and demonstrate the core concepts."
        ),
    }


def get_roadmap_data(skill: str) -> dict[str, Any]:
    """Return roadmap information for a skill."""

    normalized = normalize_skill(skill)

    return ROADMAP_DATA.get(
        normalized,
        create_generic_roadmap(skill),
    )


def calculate_week_order(priority: str, index: int) -> int:
    """
    Assign a sequential roadmap step number.
    Skills are already sorted by priority before this function is called.
    """

    return index + 1

def generate_roadmap(
    skill_gap_analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate a personalized learning roadmap from
    the existing skill-gap analysis.
    """

    skill_gaps = skill_gap_analysis.get("skill_gaps") or []

    sorted_gaps = sorted(
        skill_gaps,
        key=lambda gap: {
            "high": 0,
            "medium": 1,
            "low": 2,
        }.get(gap.get("priority"), 3),
    )

    roadmap_items = []

    for index, gap in enumerate(sorted_gaps):
        skill = gap.get("skill", "Unknown Skill")
        priority = gap.get("priority", "medium")
        category = gap.get("category", "important")

        roadmap_data = get_roadmap_data(skill)

        roadmap_items.append(
            {
                "order": calculate_week_order(priority, index),
                "skill": skill,
                "category": category,
                "priority": priority,
                "title": roadmap_data["title"],
                "duration": roadmap_data["duration"],
                "topics": roadmap_data["topics"],
                "project": roadmap_data["project"],
                "milestone": roadmap_data["milestone"],
            }
        )

    roadmap_items.sort(key=lambda item: item["order"])

    total_gaps = len(roadmap_items)

    if total_gaps == 0:
        summary = (
            "No skill-gap roadmap is required. "
            "Your current skills cover the identified job requirements."
        )
    else:
        critical_count = sum(
            1
            for item in roadmap_items
            if item["category"] == "critical"
        )

        summary = (
            f"Your roadmap contains {total_gaps} skill-development step(s). "
            f"{critical_count} critical skill gap(s) should be completed first."
        )

    return {
        "total_steps": total_gaps,
        "roadmap": roadmap_items,
        "summary": summary,
    }