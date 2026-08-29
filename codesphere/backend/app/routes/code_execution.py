from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    enforce_run_rate_limit,
    enforce_submit_rate_limit,
    get_current_user,
    get_judge_service,
    get_problem_repository,
    get_submission_repository,
    get_test_case_repository,
)
from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.models.user import User
from app.schemas.code_execution import (
    RunCodeRequest,
    RunCodeResult,
    SubmitCodeRequest,
    SubmitCodeResult,
)
from app.services.judge_service import JudgeService
from app.services.submission_service import ProblemNotFoundError, SubmissionService

router = APIRouter(prefix="/code", tags=["code"])


def _service(
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    test_case_repository: TestCaseRepository = Depends(get_test_case_repository),
    submission_repository: SubmissionRepository = Depends(get_submission_repository),
    judge_service: JudgeService = Depends(get_judge_service),
) -> SubmissionService:
    return SubmissionService(problem_repository, test_case_repository, submission_repository, judge_service)


@router.post("/run", response_model=RunCodeResult, dependencies=[Depends(enforce_run_rate_limit)])
async def run_code(
    payload: RunCodeRequest,
    current_user: User = Depends(get_current_user),
    service: SubmissionService = Depends(_service),
) -> RunCodeResult:
    try:
        return await service.run_code(current_user.id, payload.problem_id, payload.code, payload.stdin)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/submit", response_model=SubmitCodeResult, dependencies=[Depends(enforce_submit_rate_limit)])
async def submit_code(
    payload: SubmitCodeRequest,
    current_user: User = Depends(get_current_user),
    service: SubmissionService = Depends(_service),
) -> SubmitCodeResult:
    try:
        return await service.submit_code(current_user.id, payload.problem_id, payload.code)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
