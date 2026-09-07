from typing import Any


def calculate_ats_score(analysis: dict[str, Any]) -> dict[str, Any]:
    """
    Calculate a deterministic ATS-style resume score.

    Total score: 100
    """

    score = 0
    breakdown = {}
    suggestions = []

    # --------------------------------------------------
    # 1. Resume Sections — 20 points
    # --------------------------------------------------

    section_score = 0

    sections = {
        "Summary": analysis.get("summary"),
        "Skills": analysis.get("skills"),
        "Projects": analysis.get("projects"),
        "Experience": analysis.get("experience"),
        "Education": analysis.get("education"),
        "Certifications": analysis.get("certifications"),
        "Achievements": analysis.get("achievements"),
    }

    section_points = {
        "Summary": 3,
        "Skills": 4,
        "Projects": 4,
        "Experience": 4,
        "Education": 2,
        "Certifications": 1,
        "Achievements": 2,
    }

    for section_name, value in sections.items():

        if value:
            section_score += section_points[section_name]

        else:
            suggestions.append(
                f"Add a {section_name.lower()} section."
            )

    breakdown["sections"] = section_score
    score += section_score

    # --------------------------------------------------
    # 2. Technical Skills — 20 points
    # --------------------------------------------------

    skills = analysis.get("skills") or {}

    total_skills = 0

    if isinstance(skills, dict):

        for skill_list in skills.values():

            if isinstance(skill_list, list):
                total_skills += len(skill_list)

    if total_skills >= 15:
        skills_score = 20

    elif total_skills >= 10:
        skills_score = 17

    elif total_skills >= 7:
        skills_score = 14

    elif total_skills >= 4:
        skills_score = 10

    elif total_skills > 0:
        skills_score = 6

    else:
        skills_score = 0
        suggestions.append(
            "Add relevant technical skills."
        )

    breakdown["technical_skills"] = skills_score
    score += skills_score

    # --------------------------------------------------
    # 3. Projects — 20 points
    # --------------------------------------------------

    projects = analysis.get("projects") or []

    project_count = (
        len(projects)
        if isinstance(projects, list)
        else 0
    )

    if project_count >= 3:
        projects_score = 20

    elif project_count == 2:
        projects_score = 16

    elif project_count == 1:
        projects_score = 10

    else:
        projects_score = 0
        suggestions.append(
            "Add at least 2 technical projects."
        )

    # Check project descriptions
    projects_with_descriptions = 0

    if isinstance(projects, list):

        for project in projects:

            if not isinstance(project, dict):
                continue

            descriptions = project.get(
                "description"
            )

            if (
                isinstance(descriptions, list)
                and len(descriptions) >= 2
            ):
                projects_with_descriptions += 1

    if (
        project_count > 0
        and projects_with_descriptions == project_count
    ):
        projects_score = min(
            projects_score + 4,
            20,
        )

    elif project_count > 0:

        suggestions.append(
            "Add detailed descriptions to all projects."
        )

    breakdown["projects"] = projects_score
    score += projects_score

    # --------------------------------------------------
    # 4. Experience — 15 points
    # --------------------------------------------------

    experience = analysis.get("experience") or []

    experience_count = (
        len(experience)
        if isinstance(experience, list)
        else 0
    )

    if experience_count >= 3:
        experience_score = 15

    elif experience_count == 2:
        experience_score = 12

    elif experience_count == 1:
        experience_score = 8

    else:
        experience_score = 0
        suggestions.append(
            "Add internship or work experience."
        )

    breakdown["experience"] = experience_score
    score += experience_score

    # --------------------------------------------------
    # 5. Education — 10 points
    # --------------------------------------------------

    education = analysis.get("education")

    if education:

        education_text = str(
            education
        ).lower()

        education_score = 10

        if "b.tech" not in education_text and "bachelor" not in education_text:
            suggestions.append(
                "Include your degree clearly in the education section."
            )

    else:

        education_score = 0

        suggestions.append(
            "Add your education details."
        )

    breakdown["education"] = education_score
    score += education_score

    # --------------------------------------------------
    # 6. Certifications — 5 points
    # --------------------------------------------------

    certifications = analysis.get(
        "certifications"
    )

    if certifications:

        certification_text = str(
            certifications
        ).strip()

        if certification_text:

            certification_score = 5

        else:

            certification_score = 0

    else:

        certification_score = 0

        suggestions.append(
            "Add relevant certifications if available."
        )

    breakdown["certifications"] = certification_score
    score += certification_score

    # --------------------------------------------------
    # 7. Achievements — 5 points
    # --------------------------------------------------

    achievements = analysis.get(
        "achievements"
    )

    if achievements:

        achievement_text = str(
            achievements
        ).strip()

        if achievement_text:

            achievements_score = 5

        else:

            achievements_score = 0

    else:

        achievements_score = 0

        suggestions.append(
            "Add measurable achievements or accomplishments."
        )

    breakdown["achievements"] = achievements_score
    score += achievements_score

    # --------------------------------------------------
    # 8. Content Quality — 5 points
    # --------------------------------------------------

    quality_score = 0

    summary = analysis.get("summary")

    if summary:

        summary_text = str(
            summary
        ).strip()

        if len(summary_text) >= 100:
            quality_score += 2

        elif len(summary_text) >= 50:
            quality_score += 1

        else:
            suggestions.append(
                "Expand your professional summary."
            )

    # Check project descriptions for action-oriented content
    action_words = {
        "built",
        "developed",
        "implemented",
        "created",
        "designed",
        "automated",
        "improved",
        "optimized",
        "developed",
    }

    all_project_text = ""

    if isinstance(projects, list):

        for project in projects:

            if not isinstance(project, dict):
                continue

            descriptions = project.get(
                "description"
            )

            if isinstance(descriptions, list):

                all_project_text += " ".join(
                    str(item)
                    for item in descriptions
                ).lower()

    if all_project_text:

        action_word_found = any(
            word in all_project_text
            for word in action_words
        )

        if action_word_found:
            quality_score += 2

        else:
            suggestions.append(
                "Use strong action verbs in project descriptions."
            )

    # Experience descriptions
    experience_text = ""

    if isinstance(experience, list):

        for item in experience:

            if not isinstance(item, dict):
                continue

            descriptions = item.get(
                "description"
            )

            if isinstance(descriptions, list):

                experience_text += " ".join(
                    str(value)
                    for value in descriptions
                ).lower()

    if experience_text:

        if any(
            word in experience_text
            for word in action_words
        ):
            quality_score += 1

    quality_score = min(
        quality_score,
        5,
    )

    breakdown["content_quality"] = quality_score
    score += quality_score

    # --------------------------------------------------
    # Final score
    # --------------------------------------------------

    score = min(
        max(score, 0),
        100,
    )

    # Remove duplicate suggestions
    suggestions = list(
        dict.fromkeys(suggestions)
    )

    return {
        "score": score,
        "breakdown": breakdown,
        "suggestions": suggestions,
    }