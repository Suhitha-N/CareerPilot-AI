from __future__ import annotations

import ast
import json
import subprocess
import sys
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.coding_problem import CodingProblem
from backend.app.models.coding_submission import CodingSubmission
from backend.app.models.user import User


router = APIRouter(
    prefix="/api/coding",
    tags=["Coding Assessment"],
)


# ==========================================================
# SCHEMAS
# ==========================================================

class CodeSubmissionRequest(BaseModel):
    problem_id: int = Field(gt=0)
    language: str = Field(
        default="python",
        min_length=1,
        max_length=30,
    )
    code: str = Field(
        min_length=1,
        max_length=20000,
    )


# ==========================================================
# INITIAL PROBLEM BANK
# ==========================================================

PROBLEMS = [
    {
        "title": "Two Sum",
        "description": (
            "Given an array of integers and a target value, return the "
            "indices of two numbers whose sum equals the target."
        ),
        "difficulty": "Easy",
        "category": "Arrays",
        "input_format": "nums: list[int], target: int",
        "output_format": "Return a list containing the two indices.",
        "constraints": (
            "The array contains at least two integers. "
            "Exactly one valid answer exists."
        ),
        "examples": [
            {
                "input": "[2, 7, 11, 15], 9",
                "output": "[0, 1]",
            },
            {
                "input": "[3, 2, 4], 6",
                "output": "[1, 2]",
            },
        ],
        "starter_code": (
            "def two_sum(nums, target):\n"
            "    # Write your solution here\n"
            "    pass\n"
        ),
        "function_name": "two_sum",
        "test_cases": [
            {
                "args": [[2, 7, 11, 15], 9],
                "expected": [0, 1],
            },
            {
                "args": [[3, 2, 4], 6],
                "expected": [1, 2],
            },
            {
                "args": [[3, 3], 6],
                "expected": [0, 1],
            },
        ],
    },
    {
        "title": "Reverse String",
        "description": (
            "Write a function that receives a string and returns "
            "the string in reverse order."
        ),
        "difficulty": "Easy",
        "category": "Strings",
        "input_format": "s: str",
        "output_format": "Return the reversed string.",
        "constraints": (
            "The string may contain letters, numbers, and spaces."
        ),
        "examples": [
            {
                "input": '"hello"',
                "output": '"olleh"',
            },
            {
                "input": '"CareerPilot"',
                "output": '"tolipreeC"',
            },
        ],
        "starter_code": (
            "def reverse_string(s):\n"
            "    # Write your solution here\n"
            "    pass\n"
        ),
        "function_name": "reverse_string",
        "test_cases": [
            {
                "args": ["hello"],
                "expected": "olleh",
            },
            {
                "args": ["CareerPilot"],
                "expected": "tolipreeC",
            },
            {
                "args": ["Python"],
                "expected": "nohtyP",
            },
        ],
    },
    {
        "title": "Find Maximum",
        "description": (
            "Given a list of integers, return the largest value "
            "in the list."
        ),
        "difficulty": "Easy",
        "category": "Arrays",
        "input_format": "nums: list[int]",
        "output_format": "Return the maximum integer.",
        "constraints": (
            "The list contains at least one integer."
        ),
        "examples": [
            {
                "input": "[3, 8, 2, 10, 5]",
                "output": "10",
            },
            {
                "input": "[-5, -2, -10]",
                "output": "-2",
            },
        ],
        "starter_code": (
            "def find_maximum(nums):\n"
            "    # Write your solution here\n"
            "    pass\n"
        ),
        "function_name": "find_maximum",
        "test_cases": [
            {
                "args": [[3, 8, 2, 10, 5]],
                "expected": 10,
            },
            {
                "args": [[-5, -2, -10]],
                "expected": -2,
            },
            {
                "args": [[42]],
                "expected": 42,
            },
        ],
    },
    {
        "title": "Count Vowels",
        "description": (
            "Given a string, count how many vowels it contains. "
            "Count a, e, i, o, and u in both lowercase and uppercase."
        ),
        "difficulty": "Medium",
        "category": "Strings",
        "input_format": "s: str",
        "output_format": "Return the number of vowels.",
        "constraints": (
            "The string may contain letters, numbers, and spaces."
        ),
        "examples": [
            {
                "input": '"hello"',
                "output": "2",
            },
            {
                "input": '"education"',
                "output": "5",
            },
        ],
        "starter_code": (
            "def count_vowels(s):\n"
            "    # Write your solution here\n"
            "    pass\n"
        ),
        "function_name": "count_vowels",
        "test_cases": [
            {
                "args": ["hello"],
                "expected": 2,
            },
            {
                "args": ["education"],
                "expected": 5,
            },
            {
                "args": ["PYTHON"],
                "expected": 1,
            },
        ],
    },
    {
        "title": "Valid Parentheses",
        "description": (
            "Given a string containing parentheses, determine whether "
            "every opening bracket is correctly closed. "
            "Support (), [], and {}."
        ),
        "difficulty": "Medium",
        "category": "Stack",
        "input_format": "s: str",
        "output_format": (
            "Return True if valid, otherwise False."
        ),
        "constraints": (
            "The string contains only bracket characters."
        ),
        "examples": [
            {
                "input": '"()[]{}"',
                "output": "True",
            },
            {
                "input": '"([)]"',
                "output": "False",
            },
        ],
        "starter_code": (
            "def is_valid_parentheses(s):\n"
            "    # Write your solution here\n"
            "    pass\n"
        ),
        "function_name": "is_valid_parentheses",
        "test_cases": [
            {
                "args": ["()[]{}"],
                "expected": True,
            },
            {
                "args": ["([)]"],
                "expected": False,
            },
            {
                "args": ["{[]}"],
                "expected": True,
            },
        ],
    },
]


# ==========================================================
# SEED PROBLEMS
# ==========================================================

def seed_problems(db: Session) -> None:
    existing = db.scalar(
        select(CodingProblem.id).limit(1)
    )

    if existing is not None:
        return

    for problem_data in PROBLEMS:
        problem = CodingProblem(
            title=problem_data["title"],
            description=problem_data["description"],
            difficulty=problem_data["difficulty"],
            category=problem_data["category"],
            input_format=problem_data["input_format"],
            output_format=problem_data["output_format"],
            constraints=problem_data["constraints"],
            examples=problem_data["examples"],
            starter_code=problem_data["starter_code"],
            test_cases=problem_data["test_cases"],
        )

        db.add(problem)

    db.commit()


# ==========================================================
# CODE VALIDATION
# ==========================================================

ALLOWED_NODES = {
    ast.Module,
    ast.FunctionDef,
    ast.arguments,
    ast.arg,
    ast.Return,
    ast.Assign,
    ast.AnnAssign,
    ast.AugAssign,
    ast.Name,
    ast.Load,
    ast.Store,
    ast.Constant,
    ast.List,
    ast.Tuple,
    ast.Dict,
    ast.Set,
    ast.BinOp,
    ast.UnaryOp,
    ast.BoolOp,
    ast.Compare,
    ast.If,
    ast.For,
    ast.While,
    ast.Break,
    ast.Continue,
    ast.Pass,
    ast.Expr,
    ast.Call,
    ast.Subscript,
    ast.Slice,
    ast.ListComp,
    ast.DictComp,
    ast.SetComp,
    ast.comprehension,
    ast.IfExp,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Eq,
    ast.NotEq,
    ast.Lt,
    ast.LtE,
    ast.Gt,
    ast.GtE,
    ast.In,
    ast.NotIn,
    ast.And,
    ast.Or,
    ast.Not,
}


BLOCKED_NAMES = {
    "eval",
    "exec",
    "compile",
    "open",
    "input",
    "__import__",
    "globals",
    "locals",
    "vars",
    "dir",
    "getattr",
    "setattr",
    "delattr",
    "breakpoint",
    "help",
    "exit",
    "quit",
}


def validate_code(
    code: str,
    function_name: str,
) -> None:

    if len(code) > 20000:
        raise ValueError("Code is too large.")

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise ValueError(
            f"Syntax error: {exc.msg} at line {exc.lineno}."
        ) from exc

    functions = []

    for node in ast.walk(tree):

        if type(node) not in ALLOWED_NODES:
            raise ValueError(
                "Unsupported Python construct: "
                f"{type(node).__name__}."
            )

        if isinstance(node, ast.FunctionDef):
            functions.append(node.name)

        if isinstance(node, ast.Name):

            if node.id in BLOCKED_NAMES:
                raise ValueError(
                    f"Use of '{node.id}' is not allowed."
                )

            if node.id.startswith("__"):
                raise ValueError(
                    "Dunder names are not allowed."
                )

    if function_name not in functions:
        raise ValueError(
            "Your code must define the function "
            f"'{function_name}'."
        )

    if len(functions) != 1:
        raise ValueError(
            "Submit exactly one function."
        )


# ==========================================================
# SAFE EXECUTION
# ==========================================================

SAFE_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "range": range,
    "reversed": reversed,
    "round": round,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
}


def execute_submission(
    code: str,
    function_name: str,
    test_cases: list,
) -> dict:
    """
    Development evaluator.

    Candidate code is validated using AST and executed
    in a restricted Python subprocess.

    This is NOT a production security sandbox.

    Production deployment should use isolated containers
    with CPU, memory, filesystem and network restrictions.
    """

    validate_code(
        code,
        function_name,
    )

    payload = {
        "code": code,
        "function_name": function_name,
        "test_cases": test_cases,
    }

    runner = r'''
import json
import sys

payload = json.loads(sys.stdin.read())

code = payload["code"]
function_name = payload["function_name"]
test_cases = payload["test_cases"]

safe_builtins = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "range": range,
    "reversed": reversed,
    "round": round,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
}

scope = {
    "__builtins__": safe_builtins,
}

exec(code, scope)

if function_name not in scope:
    raise RuntimeError(
        "Required function was not created."
    )

function = scope[function_name]

results = []

for test in test_cases:
    try:
        args = test["args"]
        expected = test["expected"]

        actual = function(*args)

        results.append(
            {
                "passed": actual == expected,
                "actual": actual,
                "expected": expected,
            }
        )

    except Exception as exc:
        results.append(
            {
                "passed": False,
                "actual": None,
                "expected": test["expected"],
                "error": str(exc),
            }
        )

print(json.dumps(results))
'''

    started = time.perf_counter()

    try:
        completed = subprocess.run(
            [
                sys.executable,
                "-I",
                "-S",
                "-c",
                runner,
            ],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            timeout=3,
        )

    except subprocess.TimeoutExpired:

        return {
            "status": "Time Limit Exceeded",
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "execution_time_ms": 3000,
            "output": (
                "Execution exceeded the 3 second limit."
            ),
            "results": [],
        }

    elapsed = int(
        (time.perf_counter() - started) * 1000
    )

    if completed.returncode != 0:

        error = completed.stderr.strip()

        return {
            "status": "Runtime Error",
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "execution_time_ms": elapsed,
            "output": error[:5000],
            "results": [],
        }

    try:
        results = json.loads(
            completed.stdout
        )

    except json.JSONDecodeError:

        return {
            "status": "Runtime Error",
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "execution_time_ms": elapsed,
            "output": "Invalid execution result.",
            "results": [],
        }

    passed = sum(
        1
        for result in results
        if result.get("passed") is True
    )

    total = len(test_cases)

    if passed == total:
        status = "Accepted"

    elif passed > 0:
        status = "Partially Accepted"

    else:
        status = "Wrong Answer"

    return {
        "status": status,
        "passed_tests": passed,
        "total_tests": total,
        "execution_time_ms": elapsed,
        "output": "",
        "results": results,
    }


# ==========================================================
# GET PROBLEMS
# ==========================================================

@router.get("/problems")
def get_problems(
    difficulty: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    seed_problems(db)

    query = select(
        CodingProblem
    ).order_by(
        CodingProblem.id.asc()
    )

    if difficulty:

        normalized = difficulty.strip().lower()

        query = query.where(
            CodingProblem.difficulty.ilike(
                normalized
            )
        )

    problems = db.scalars(query).all()

    return [
        {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty,
            "category": problem.category,
            "input_format": problem.input_format,
            "output_format": problem.output_format,
            "constraints": problem.constraints,
            "examples": problem.examples or [],
            "starter_code": problem.starter_code or "",
        }
        for problem in problems
    ]


# ==========================================================
# GET SINGLE PROBLEM
# ==========================================================

@router.get("/problems/{problem_id}")
def get_problem(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    seed_problems(db)

    problem = db.scalar(
        select(CodingProblem).where(
            CodingProblem.id == problem_id
        )
    )

    if not problem:
        raise HTTPException(
            status_code=404,
            detail="Coding problem not found.",
        )

    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "category": problem.category,
        "input_format": problem.input_format,
        "output_format": problem.output_format,
        "constraints": problem.constraints,
        "examples": problem.examples or [],
        "starter_code": problem.starter_code or "",
    }


# ==========================================================
# SUBMIT CODE
# ==========================================================

@router.post("/submit")
def submit_code(
    payload: CodeSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    seed_problems(db)

    if payload.language.lower() != "python":
        raise HTTPException(
            status_code=400,
            detail=(
                "The first coding assessment version "
                "supports Python only."
            ),
        )

    problem = db.scalar(
        select(CodingProblem).where(
            CodingProblem.id == payload.problem_id
        )
    )

    if not problem:
        raise HTTPException(
            status_code=404,
            detail="Coding problem not found.",
        )

    test_cases = problem.test_cases or []

    problem_config = next(
        (
            item
            for item in PROBLEMS
            if item["title"] == problem.title
        ),
        None,
    )

    if not problem_config:
        raise HTTPException(
            status_code=500,
            detail="Problem configuration not found.",
        )

    function_name = problem_config["function_name"]

    try:
        result = execute_submission(
            code=payload.code,
            function_name=function_name,
            test_cases=test_cases,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to evaluate submission: {exc}"
            ),
        ) from exc

    total_tests = result["total_tests"]
    passed_tests = result["passed_tests"]

    score = (
        round(
            (passed_tests / total_tests) * 100
        )
        if total_tests
        else 0
    )

    submission = CodingSubmission(
        user_id=current_user.id,
        problem_id=problem.id,
        language=payload.language.lower(),
        code=payload.code,
        status=result["status"],
        score=score,
        passed_tests=passed_tests,
        total_tests=total_tests,
        execution_time_ms=result[
            "execution_time_ms"
        ],
        output=result["output"],
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {
        "submission_id": submission.id,
        "problem_id": problem.id,
        "problem_title": problem.title,
        "status": result["status"],
        "score": score,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "execution_time_ms": result[
            "execution_time_ms"
        ],
        "output": result["output"],
        "test_results": result["results"],
    }


# ==========================================================
# MY SUBMISSIONS
# ==========================================================

@router.get("/submissions")
def get_my_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    submissions = db.scalars(
        select(CodingSubmission)
        .where(
            CodingSubmission.user_id
            == current_user.id
        )
        .order_by(
            CodingSubmission.created_at.desc()
        )
    ).all()

    return [
        {
            "id": submission.id,
            "problem_id": submission.problem_id,
            "language": submission.language,
            "status": submission.status,
            "score": submission.score,
            "passed_tests": submission.passed_tests,
            "total_tests": submission.total_tests,
            "execution_time_ms": (
                submission.execution_time_ms
            ),
            "created_at": submission.created_at,
        }
        for submission in submissions
    ]


# ==========================================================
# CODING ANALYTICS
# ==========================================================

@router.get("/analytics")
def get_coding_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalized coding performance analytics.

    Metrics:
    - Overall coding score
    - Test accuracy
    - Execution efficiency
    - Recent performance
    - Consistency
    - Category performance
    - Strong categories
    - Weak categories
    - Recommendations
    """

    submissions = db.scalars(
        select(CodingSubmission)
        .where(
            CodingSubmission.user_id
            == current_user.id
        )
        .order_by(
            CodingSubmission.created_at.desc()
        )
    ).all()

    # ------------------------------------------------------
    # EMPTY STATE
    # ------------------------------------------------------

    if not submissions:

        return {
            "overall_score": 0,
            "test_accuracy": 0,
            "execution_efficiency": 0,
            "recent_performance": 0,
            "consistency": 0,
            "total_submissions": 0,
            "accepted_submissions": 0,
            "total_tests": 0,
            "passed_tests": 0,
            "strong_categories": [],
            "weak_categories": [],
            "category_performance": [],
            "recommendations": [
                (
                    "Solve your first coding problem "
                    "to start tracking performance."
                )
            ],
        }

    # ------------------------------------------------------
    # BASIC STATISTICS
    # ------------------------------------------------------

    total_submissions = len(submissions)

    accepted_submissions = sum(
        1
        for submission in submissions
        if submission.status == "Accepted"
    )

    total_tests = sum(
        submission.total_tests or 0
        for submission in submissions
    )

    passed_tests = sum(
        submission.passed_tests or 0
        for submission in submissions
    )

    # ------------------------------------------------------
    # TEST ACCURACY
    # ------------------------------------------------------

    if total_tests > 0:

        test_accuracy = round(
            (
                passed_tests
                / total_tests
            ) * 100
        )

    else:
        test_accuracy = 0

    # ------------------------------------------------------
    # EXECUTION EFFICIENCY
    # ------------------------------------------------------

    execution_scores = []

    for submission in submissions:

        execution_time = (
            submission.execution_time_ms or 0
        )

        if execution_time <= 100:
            efficiency = 100

        elif execution_time <= 250:
            efficiency = 90

        elif execution_time <= 500:
            efficiency = 80

        elif execution_time <= 1000:
            efficiency = 65

        elif execution_time <= 2000:
            efficiency = 50

        else:
            efficiency = 35

        execution_scores.append(
            efficiency
        )

    execution_efficiency = round(
        sum(execution_scores)
        / len(execution_scores)
    )

    # ------------------------------------------------------
    # RECENT PERFORMANCE
    # ------------------------------------------------------

    recent_submissions = submissions[:5]

    recent_scores = [
        submission.score or 0
        for submission in recent_submissions
    ]

    recent_performance = round(
        sum(recent_scores)
        / len(recent_scores)
    )

    # ------------------------------------------------------
    # CONSISTENCY
    # ------------------------------------------------------

    consistency = round(
        (
            accepted_submissions
            / total_submissions
        ) * 100
    )

    # ------------------------------------------------------
    # OVERALL CODING SCORE
    #
    # Accuracy        60%
    # Efficiency      15%
    # Recent          15%
    # Consistency     10%
    # ------------------------------------------------------

    overall_score = round(
        (test_accuracy * 0.60)
        + (execution_efficiency * 0.15)
        + (recent_performance * 0.15)
        + (consistency * 0.10)
    )

    overall_score = max(
        0,
        min(100, overall_score)
    )

    # ------------------------------------------------------
    # CATEGORY ANALYSIS
    # ------------------------------------------------------

    category_scores = {}

    for submission in submissions:

        problem = db.scalar(
            select(CodingProblem)
            .where(
                CodingProblem.id
                == submission.problem_id
            )
        )

        if not problem:
            continue

        category = (
            problem.category
            or "General"
        )

        if category not in category_scores:
            category_scores[category] = []

        category_scores[category].append(
            submission.score or 0
        )

    category_results = []

    for category, scores in category_scores.items():

        average = round(
            sum(scores)
            / len(scores)
        )

        category_results.append(
            {
                "category": category,
                "score": average,
                "attempts": len(scores),
            }
        )

    category_results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    strong_categories = [
        item
        for item in category_results
        if item["score"] >= 75
    ][:3]

    weak_categories = [
        item
        for item in sorted(
            category_results,
            key=lambda item: item["score"],
        )
        if item["score"] < 75
    ][:3]

    # ------------------------------------------------------
    # RECOMMENDATIONS
    # ------------------------------------------------------

    recommendations = []

    if test_accuracy < 60:

        recommendations.append(
            (
                "Focus on solving problems correctly "
                "before optimizing speed."
            )
        )

    elif test_accuracy < 80:

        recommendations.append(
            (
                "Improve edge-case handling "
                "to increase test-case accuracy."
            )
        )

    else:

        recommendations.append(
            (
                "Your test accuracy is strong. "
                "Start focusing on optimization."
            )
        )

    if execution_efficiency < 70:

        recommendations.append(
            (
                "Review time complexity and look "
                "for more efficient algorithms."
            )
        )

    if weak_categories:

        weakest = weak_categories[0]["category"]

        recommendations.append(
            (
                f"Practice more {weakest} problems "
                "to strengthen this area."
            )
        )

    if total_submissions < 5:

        recommendations.append(
            (
                "Complete at least 5 coding problems "
                "to build a reliable performance profile."
            )
        )

    if overall_score >= 85:

        recommendations.append(
            (
                "Excellent coding performance. "
                "Start attempting harder problems."
            )
        )

    elif overall_score >= 70:

        recommendations.append(
            (
                "Good progress. Mix medium and difficult "
                "problems into your practice."
            )
        )

    else:

        recommendations.append(
            (
                "Maintain a daily coding routine and "
                "gradually increase difficulty."
            )
        )

    return {
        "overall_score": overall_score,
        "test_accuracy": test_accuracy,
        "execution_efficiency": execution_efficiency,
        "recent_performance": recent_performance,
        "consistency": consistency,
        "total_submissions": total_submissions,
        "accepted_submissions": accepted_submissions,
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "strong_categories": strong_categories,
        "weak_categories": weak_categories,
        "category_performance": category_results,
        "recommendations": recommendations[:5],
    }