import re


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_words(text: str) -> list[str]:
    return normalize_text(text).split()


# ============================================================
# STOP WORDS
# ============================================================

STOP_WORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "i",
    "me",
    "my",
    "we",
    "our",
    "you",
    "your",
    "this",
    "that",
    "it",
    "as",
    "at",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "did",
    "does",
    "how",
    "what",
    "why",
    "which",
    "can",
    "could",
    "would",
    "should",
    "from",
    "about",
    "into",
    "than",
    "then",
    "also",
    "will",
    "was",
    "were",
}


def meaningful_words(text: str) -> set[str]:
    return {
        word
        for word in get_words(text)
        if len(word) >= 4 and word not in STOP_WORDS
    }


# ============================================================
# QUESTION TYPE
# ============================================================

def detect_question_type(question: str) -> str:

    q = normalize_text(question)

    if "tell me about yourself" in q:
        return "introduction"

    if "technical background" in q:
        return "introduction"

    if "project" in q and "resume" in q:
        return "project"

    if "why are you interested" in q:
        return "motivation"

    if "career goals" in q:
        return "motivation"

    if "practical experience" in q:
        return "technical"

    if "challenging technical problem" in q:
        return "problem_solving"

    if "how would you analyze" in q:
        return "problem_solving"

    if "how would you approach" in q:
        return "problem_solving"

    return "general"


# ============================================================
# QUESTION-SPECIFIC EXPECTATIONS
# ============================================================

QUESTION_EXPECTATIONS = {

    "introduction": {
        "background",
        "experience",
        "skills",
        "technical",
        "education",
        "career",
        "project",
    },

    "project": {
        "project",
        "problem",
        "technology",
        "technologies",
        "developed",
        "implemented",
        "built",
        "designed",
        "contribution",
        "challenge",
        "solution",
        "result",
    },

    "motivation": {
        "interest",
        "interested",
        "role",
        "career",
        "goals",
        "motivation",
        "skills",
        "experience",
        "company",
    },

    "technical": {
        "experience",
        "practical",
        "used",
        "project",
        "technology",
        "implementation",
        "application",
    },

    "problem_solving": {
        "problem",
        "approach",
        "analyze",
        "identify",
        "debug",
        "solution",
        "implement",
        "testing",
        "test",
        "result",
        "verify",
        "improve",
    },

    "general": set(),
}


# ============================================================
# CATEGORY EXPECTATIONS
# ============================================================

CATEGORY_EXPECTATIONS = {

    "hr": {
        "experience",
        "skills",
        "career",
        "goal",
        "interest",
        "team",
        "communication",
        "learning",
        "strength",
        "motivation",
    },

    "resume": {
        "project",
        "developed",
        "implemented",
        "designed",
        "built",
        "technology",
        "challenge",
        "solution",
        "result",
        "contribution",
    },

    "technical": {
        "python",
        "java",
        "javascript",
        "typescript",
        "sql",
        "database",
        "api",
        "rest",
        "algorithm",
        "data",
        "framework",
        "testing",
        "debug",
        "performance",
        "architecture",
        "docker",
        "aws",
        "git",
        "linux",
    },

    "problem solving": {
        "problem",
        "approach",
        "analyze",
        "debug",
        "solution",
        "testing",
        "result",
        "improve",
        "identify",
        "implement",
        "verify",
    },
}


# ============================================================
# TECHNICAL CONCEPTS
# ============================================================

TECHNICAL_CONCEPTS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "postgresql",
    "mysql",
    "database",
    "api",
    "rest",
    "fastapi",
    "django",
    "flask",
    "algorithm",
    "data",
    "testing",
    "pytest",
    "debug",
    "debugging",
    "docker",
    "aws",
    "git",
    "github",
    "linux",
    "framework",
    "architecture",
    "performance",
    "backend",
    "frontend",
}


# ============================================================
# RELEVANCE CALCULATION
# ============================================================

def calculate_relevance(
    question: str,
    answer: str,
) -> tuple[float, list[str]]:

    question_words = meaningful_words(question)
    answer_words = meaningful_words(answer)

    if not question_words or not answer_words:
        return 0.0, []

    direct_matches = question_words.intersection(answer_words)

    # Direct question-word overlap.
    direct_ratio = (
        len(direct_matches)
        / max(len(question_words), 1)
    )

    question_type = detect_question_type(question)

    expected = QUESTION_EXPECTATIONS.get(
        question_type,
        set(),
    )

    expected_matches = answer_words.intersection(expected)

    expected_ratio = (
        len(expected_matches)
        / max(min(len(expected), 8), 1)
    )

    # Question-specific concepts are more useful than exact
    # question-word matching.
    relevance = (
        direct_ratio * 0.45
        + min(expected_ratio, 1.0) * 0.55
    )

    return min(relevance, 1.0), sorted(
        direct_matches.union(expected_matches)
    )


# ============================================================
# CONCEPT SCORE
# ============================================================

def calculate_concept_score(
    question: str,
    category: str,
    answer: str,
) -> tuple[float, list[str]]:

    answer_words = meaningful_words(answer)

    question_type = detect_question_type(question)

    question_concepts = QUESTION_EXPECTATIONS.get(
        question_type,
        set(),
    )

    category_concepts = CATEGORY_EXPECTATIONS.get(
        category.lower(),
        set(),
    )

    # Question concepts have higher priority.
    if question_concepts:
        matches = answer_words.intersection(
            question_concepts
        )

        # We don't require every expected concept.
        target = min(
            max(len(question_concepts), 1),
            6,
        )

        score = min(
            len(matches) / target,
            1.0,
        )

        return score, sorted(matches)

    matches = answer_words.intersection(
        category_concepts
    )

    if not category_concepts:
        return 0.5, sorted(matches)

    score = min(
        len(matches) / 5,
        1.0,
    )

    return score, sorted(matches)


# ============================================================
# ANSWER DEPTH
# ============================================================

def calculate_depth(answer: str) -> float:

    word_count = len(get_words(answer))

    if word_count < 8:
        return 0.15

    if word_count < 15:
        return 0.35

    if word_count < 30:
        return 0.55

    if word_count < 50:
        return 0.72

    if word_count < 80:
        return 0.85

    if word_count < 120:
        return 0.95

    return 1.0


# ============================================================
# STRUCTURE
# ============================================================

def calculate_structure(answer: str) -> float:

    text = normalize_text(answer)

    indicators = [
        "first",
        "second",
        "then",
        "because",
        "therefore",
        "finally",
        "for example",
        "for instance",
        "challenge",
        "solution",
        "result",
        "outcome",
        "approach",
    ]

    matches = [
        item
        for item in indicators
        if item in text
    ]

    if len(matches) >= 4:
        return 1.0

    if len(matches) >= 3:
        return 0.9

    if len(matches) == 2:
        return 0.75

    if len(matches) == 1:
        return 0.60

    # A reasonably long answer can still have acceptable
    # natural structure without special transition words.
    word_count = len(get_words(answer))

    if word_count >= 35:
        return 0.65

    if word_count >= 20:
        return 0.55

    return 0.40


# ============================================================
# TECHNICAL QUALITY
# ============================================================

def calculate_technical_score(
    answer: str,
    category: str,
) -> float:

    if category.lower() != "technical":
        return 0.6

    answer_words = meaningful_words(answer)

    matches = answer_words.intersection(
        TECHNICAL_CONCEPTS
    )

    if len(matches) >= 5:
        return 1.0

    if len(matches) >= 4:
        return 0.9

    if len(matches) >= 3:
        return 0.8

    if len(matches) >= 2:
        return 0.65

    if len(matches) == 1:
        return 0.45

    return 0.20


# ============================================================
# QUESTION-SPECIFIC QUALITY
# ============================================================

def question_quality_score(
    question: str,
    answer: str,
) -> float:

    question_type = detect_question_type(question)

    words = meaningful_words(answer)

    if question_type == "introduction":

        useful = {
            "education",
            "experience",
            "skills",
            "technical",
            "project",
            "career",
            "background",
        }

        matches = words.intersection(useful)

        return min(len(matches) / 3, 1.0)

    if question_type == "project":

        useful = {
            "project",
            "problem",
            "technology",
            "developed",
            "implemented",
            "built",
            "challenge",
            "solution",
            "result",
            "contribution",
        }

        matches = words.intersection(useful)

        return min(len(matches) / 4, 1.0)

    if question_type == "motivation":

        useful = {
            "interest",
            "interested",
            "role",
            "career",
            "goals",
            "motivation",
            "skills",
            "experience",
        }

        matches = words.intersection(useful)

        return min(len(matches) / 3, 1.0)

    if question_type == "technical":

        useful = {
            "experience",
            "used",
            "project",
            "technology",
            "implementation",
            "application",
            "practical",
        }

        matches = words.intersection(useful)

        return min(len(matches) / 3, 1.0)

    if question_type == "problem_solving":

        useful = {
            "problem",
            "approach",
            "analyze",
            "identify",
            "debug",
            "solution",
            "testing",
            "result",
            "verify",
            "improve",
        }

        matches = words.intersection(useful)

        return min(len(matches) / 4, 1.0)

    return 0.5


# ============================================================
# GENERIC ANSWER DETECTION
# ============================================================

GENERIC_PHRASES = [
    "i am a hardworking person",
    "i am a quick learner",
    "i am passionate",
    "i am very passionate",
    "i have good communication skills",
    "i can work in a team",
    "i want to improve my skills",
    "i am interested in this job",
]


def generic_penalty(answer: str) -> float:

    text = normalize_text(answer)

    matches = 0

    for phrase in GENERIC_PHRASES:
        if phrase in text:
            matches += 1

    if matches == 0:
        return 0.0

    if matches == 1:
        return 3.0

    if matches == 2:
        return 7.0

    return 10.0


# ============================================================
# VERY LOW RELEVANCE PROTECTION
# ============================================================

def apply_relevance_cap(
    score: float,
    relevance: float,
) -> float:

    if relevance < 0.10:
        return min(score, 30)

    if relevance < 0.20:
        return min(score, 40)

    if relevance < 0.30:
        return min(score, 50)

    return score


# ============================================================
# MAIN EVALUATOR
# ============================================================

def evaluate_answer(
    question: str,
    category: str,
    answer: str,
) -> tuple[int, str]:

    answer_clean = normalize_text(answer)

    if not answer_clean:

        return (
            0,
            "No answer was provided. Please answer the question.",
        )

    # --------------------------------------------------------
    # Individual scores
    # --------------------------------------------------------

    relevance, relevance_matches = calculate_relevance(
        question,
        answer,
    )

    concept_score, concept_matches = calculate_concept_score(
        question,
        category,
        answer,
    )

    depth = calculate_depth(answer)

    structure = calculate_structure(answer)

    technical = calculate_technical_score(
        answer,
        category,
    )

    question_quality = question_quality_score(
        question,
        answer,
    )

    penalty = generic_penalty(answer)

    # --------------------------------------------------------
    # Final weighted score
    # --------------------------------------------------------

    score = (
        relevance * 40
        + concept_score * 25
        + depth * 15
        + structure * 10
        + technical * 5
        + question_quality * 5
    )

    score -= penalty

    # --------------------------------------------------------
    # Protect against unrelated long answers
    # --------------------------------------------------------

    score = apply_relevance_cap(
        score,
        relevance,
    )

    # --------------------------------------------------------
    # Minimum / maximum
    # --------------------------------------------------------

    score = round(
        max(
            0,
            min(100, score),
        )
    )

    # ========================================================
    # FEEDBACK
    # ========================================================

    feedback = []

    # --------------------------------------------------------
    # Overall assessment
    # --------------------------------------------------------

    if score >= 85:

        feedback.append(
            "Excellent answer. Your response is relevant, "
            "specific, and well developed."
        )

    elif score >= 70:

        feedback.append(
            "Good answer. You addressed the main question, "
            "but you can strengthen it with more specific evidence."
        )

    elif score >= 55:

        feedback.append(
            "Fair answer. You have some relevant content, "
            "but the response needs more question-specific detail."
        )

    elif score >= 40:

        feedback.append(
            "The answer needs improvement. Some useful information "
            "is present, but the connection to the question is weak."
        )

    else:

        feedback.append(
            "The answer is not sufficiently relevant to the question. "
            "Focus directly on what the interviewer asked."
        )

    # --------------------------------------------------------
    # Relevance feedback
    # --------------------------------------------------------

    if relevance >= 0.70:

        feedback.append(
            "Strong question relevance."
        )

    elif relevance >= 0.45:

        feedback.append(
            "Your answer is reasonably related to the question."
        )

    elif relevance >= 0.25:

        feedback.append(
            "Your answer is only partially related to the question."
        )

    else:

        feedback.append(
            "Your answer should focus more directly on the question."
        )

    # --------------------------------------------------------
    # Concept feedback
    # --------------------------------------------------------

    if concept_matches:

        feedback.append(
            "Relevant concepts detected: "
            + ", ".join(concept_matches[:6])
            + "."
        )

    else:

        feedback.append(
            "Add concepts and details that directly address the question."
        )

    # --------------------------------------------------------
    # Depth
    # --------------------------------------------------------

    if depth < 0.40:

        feedback.append(
            "Give a more complete explanation with a specific example."
        )

    elif depth >= 0.80:

        feedback.append(
            "The answer provides a good level of detail."
        )

    # --------------------------------------------------------
    # Structure
    # --------------------------------------------------------

    if structure >= 0.80:

        feedback.append(
            "Your response has a clear reasoning structure."
        )

    elif structure < 0.55:

        feedback.append(
            "Use a clearer structure: situation, approach, "
            "action, and result."
        )

    # --------------------------------------------------------
    # Technical feedback
    # --------------------------------------------------------

    if category.lower() == "technical":

        if technical >= 0.80:

            feedback.append(
                "Good technical depth with concrete technical concepts."
            )

        elif technical >= 0.50:

            feedback.append(
                "Add more concrete technologies or implementation details."
            )

        else:

            feedback.append(
                "Your technical answer needs specific technologies, "
                "implementation details, or examples."
            )

    # --------------------------------------------------------
    # Question-specific advice
    # --------------------------------------------------------

    question_type = detect_question_type(question)

    if question_type == "introduction":

        feedback.append(
            "For an introduction, connect your education, "
            "technical skills, projects, experience, and career direction."
        )

    elif question_type == "project":

        feedback.append(
            "For a project question, explain the problem, "
            "your contribution, technologies, challenges, "
            "solution, and result."
        )

    elif question_type == "motivation":

        feedback.append(
            "For a motivation question, explain why this role "
            "interests you and connect it to your skills and career goals."
        )

    elif question_type == "technical":

        feedback.append(
            "For a technical experience question, give a real project "
            "example showing how you used the technology."
        )

    elif question_type == "problem_solving":

        feedback.append(
            "For problem solving, explain how you identify the problem, "
            "analyze it, debug it, implement a solution, test it, "
            "and verify the result."
        )

    # --------------------------------------------------------
    # Generic-answer warning
    # --------------------------------------------------------

    if penalty > 0:

        feedback.append(
            "Avoid relying on generic statements. "
            "Use specific examples from your own experience."
        )

    return score, " ".join(feedback)