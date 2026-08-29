import asyncio

from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.models.common import SubmissionType, TestCaseVisibility, Verdict
from app.models.submission import Submission
from app.schemas.code_execution import RunCodeResult, SubmitCodeResult, TestCaseResult
from app.services.judge_service import ExecutionResult, JudgeService, JudgeServiceError


class ProblemNotFoundError(Exception):
    pass


class SubmissionService:
    def __init__(
        self,
        problem_repository: ProblemRepository,
        test_case_repository: TestCaseRepository,
        submission_repository: SubmissionRepository,
        judge_service: JudgeService,
    ):
        self.problem_repository = problem_repository
        self.test_case_repository = test_case_repository
        self.submission_repository = submission_repository
        self.judge_service = judge_service

    async def run_code(self, student_id: str, problem_id: str, code: str, stdin: str) -> RunCodeResult:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        try:
            result = await self.judge_service.execute(source_code=code, stdin=stdin)
        except JudgeServiceError:
            result = ExecutionResult(
                verdict=Verdict.INTERNAL_ERROR,
                status_description="Could not reach the code execution service. Please try again.",
            )

        return RunCodeResult(
            verdict=result.verdict,
            stdout=result.stdout,
            stderr=result.stderr,
            compile_output=result.compile_output,
            status_description=result.status_description,
            time_seconds=result.time_seconds,
            memory_kb=result.memory_kb,
        )

    async def submit_code(self, student_id: str, problem_id: str, code: str) -> SubmitCodeResult:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        test_cases = await self.test_case_repository.find_many({"problemId": problem_id}, limit=1000)
        # Deterministic order: public cases first (as shown to the student), then hidden.
        test_cases.sort(key=lambda tc: (tc.visibility != TestCaseVisibility.PUBLIC, tc.id))

        if not test_cases:
            verdict = Verdict.INTERNAL_ERROR
            passed = 0
            total = 0
            case_results: list[TestCaseResult] = []
            compile_output = "This problem has no test cases configured yet."
        else:
            # Run the first case alone so a compile error short-circuits the
            # rest (identical source recompiled N times would just repeat it).
            first = await self._execute_case(code, test_cases[0])
            results = [first]

            if first.verdict not in (Verdict.COMPILATION_ERROR, Verdict.INTERNAL_ERROR) and len(test_cases) > 1:
                remaining = await asyncio.gather(
                    *(self._execute_case(code, tc) for tc in test_cases[1:])
                )
                results.extend(remaining)
            elif len(test_cases) > 1:
                # Compile/internal error: don't re-run, just mark the rest the same way.
                results.extend(ExecutionResult(verdict=first.verdict) for _ in test_cases[1:])

            case_results = [
                TestCaseResult(index=i + 1, verdict=r.verdict) for i, r in enumerate(results)
            ]
            passed = sum(1 for r in results if r.verdict == Verdict.ACCEPTED)
            total = len(results)
            verdict = Verdict.ACCEPTED if passed == total else next(
                (r.verdict for r in results if r.verdict != Verdict.ACCEPTED), Verdict.WRONG_ANSWER
            )
            compile_output = first.compile_output

        score = problem.marks if verdict == Verdict.ACCEPTED else 0

        submission = await self.submission_repository.insert_one(
            Submission(
                student_id=student_id,
                round_id=None,
                problem_id=problem_id,
                code=code,
                language="C",
                submission_type=SubmissionType.SUBMIT,
                verdict=verdict,
                score=score,
                passed_tests=passed,
                total_tests=total,
            )
        )

        return SubmitCodeResult(
            submission_id=submission.id,
            verdict=verdict,
            score=score,
            passed_tests=passed,
            total_tests=total,
            test_case_results=case_results,
            compile_output=compile_output,
        )

    async def _execute_case(self, code: str, test_case) -> ExecutionResult:
        try:
            return await self.judge_service.execute(
                source_code=code, stdin=test_case.input, expected_output=test_case.expected_output
            )
        except JudgeServiceError:
            return ExecutionResult(
                verdict=Verdict.INTERNAL_ERROR,
                status_description="Could not reach the code execution service.",
            )
