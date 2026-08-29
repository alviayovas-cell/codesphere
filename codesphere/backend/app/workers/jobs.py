"""RQ job functions.

These run inside a worker process (see run_worker.py), NOT the FastAPI
event loop - that's the whole point of the queue (spec section 12):
even a burst of 60 students hitting Run/Submit never blocks the web
process, because the actual Judge0 call and MongoDB write happen here,
in a separate process, one job at a time (or a few, with -w/--workers).

RQ's standard worker model calls job functions synchronously, so this
module uses plain PyMongo and SyncJudgeService rather than the async
Motor/httpx stack the FastAPI app uses elsewhere.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from bson import ObjectId
from pymongo import MongoClient

from app.core.config import settings
from app.models.common import SubmissionType, TestCaseVisibility, Verdict
from app.services.judge_service import ExecutionResult, JudgeServiceError, SyncJudgeService

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def _get_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client[settings.mongodb_db_name]


def _unreachable_result() -> ExecutionResult:
    return ExecutionResult(
        verdict=Verdict.INTERNAL_ERROR,
        status_description="Could not reach the code execution service. Please try again.",
    )


def run_code_job(student_id: str, problem_id: str, code: str, stdin: str) -> dict:
    """Run Code: execute against student-supplied stdin, no grading, nothing
    persisted. Returns a dict matching the RunCodeResult schema (camelCase
    keys, since this is read back and re-served as-is by the job-status
    endpoint)."""
    db = _get_db()
    if not ObjectId.is_valid(problem_id) or db.problems.find_one({"_id": ObjectId(problem_id)}) is None:
        return {"error": "Problem not found"}

    judge = SyncJudgeService()
    try:
        result = judge.execute(source_code=code, stdin=stdin)
    except JudgeServiceError as exc:
        logger.error("run_code_job: Judge0 unreachable: %s", exc)
        result = _unreachable_result()

    return {
        "verdict": result.verdict.value,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "compileOutput": result.compile_output,
        "statusDescription": result.status_description,
        "timeSeconds": result.time_seconds,
        "memoryKb": result.memory_kb,
    }


def _execute_case(judge: SyncJudgeService, code: str, test_case: dict) -> ExecutionResult:
    try:
        return judge.execute(
            source_code=code, stdin=test_case["input"], expected_output=test_case["expectedOutput"]
        )
    except JudgeServiceError as exc:
        logger.error("submit_code_job: Judge0 unreachable for a test case: %s", exc)
        return _unreachable_result()


def submit_code_job(student_id: str, problem_id: str, code: str) -> dict:
    """Submit Code: run every test case (public + hidden), score, and
    persist a Submission. Returns a dict matching the SubmitCodeResult
    schema."""
    db = _get_db()
    if not ObjectId.is_valid(problem_id):
        return {"error": "Problem not found"}

    problem_doc = db.problems.find_one({"_id": ObjectId(problem_id)})
    if problem_doc is None:
        return {"error": "Problem not found"}

    test_cases = list(db.test_cases.find({"problemId": problem_id}))
    test_cases.sort(key=lambda tc: (tc["visibility"] != TestCaseVisibility.PUBLIC.value, str(tc["_id"])))

    judge = SyncJudgeService()

    if not test_cases:
        verdict = Verdict.INTERNAL_ERROR
        passed = 0
        total = 0
        case_results: list[dict] = []
        compile_output = "This problem has no test cases configured yet."
    else:
        first = _execute_case(judge, code, test_cases[0])
        results = [first]

        if first.verdict not in (Verdict.COMPILATION_ERROR, Verdict.INTERNAL_ERROR) and len(test_cases) > 1:
            with ThreadPoolExecutor(max_workers=min(len(test_cases) - 1, 8)) as pool:
                results.extend(pool.map(lambda tc: _execute_case(judge, code, tc), test_cases[1:]))
        elif len(test_cases) > 1:
            results.extend(ExecutionResult(verdict=first.verdict) for _ in test_cases[1:])

        case_results = [{"index": i + 1, "verdict": r.verdict.value} for i, r in enumerate(results)]
        passed = sum(1 for r in results if r.verdict == Verdict.ACCEPTED)
        total = len(results)
        verdict = (
            Verdict.ACCEPTED
            if passed == total
            else next((r.verdict for r in results if r.verdict != Verdict.ACCEPTED), Verdict.WRONG_ANSWER)
        )
        compile_output = first.compile_output

    score = problem_doc["marks"] if verdict == Verdict.ACCEPTED else 0
    now = datetime.now(timezone.utc)

    inserted = db.submissions.insert_one(
        {
            "studentId": student_id,
            "roundId": None,
            "problemId": problem_id,
            "code": code,
            "language": "C",
            "submissionType": SubmissionType.SUBMIT.value,
            "verdict": verdict.value,
            "score": score,
            "passedTests": passed,
            "totalTests": total,
            "submittedAt": now,
        }
    )

    return {
        "submissionId": str(inserted.inserted_id),
        "verdict": verdict.value,
        "score": score,
        "passedTests": passed,
        "totalTests": total,
        "testCaseResults": case_results,
        "compileOutput": compile_output,
    }
