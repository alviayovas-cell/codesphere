from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_current_user,
    get_problem_repository,
    get_test_case_repository,
)
from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
from app.models.user import User
from app.schemas.problem import ProblemPublic, ProblemSummary
from app.services.problem_service import ProblemNotFoundError, ProblemService

router = APIRouter(prefix="/problems", tags=["problems"])


def _service(
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    test_case_repository: TestCaseRepository = Depends(get_test_case_repository),
) -> ProblemService:
    return ProblemService(problem_repository, test_case_repository)


@router.get("", response_model=list[ProblemSummary])
async def list_problems(
    _: User = Depends(get_current_user),
    service: ProblemService = Depends(_service),
) -> list[ProblemSummary]:
    return await service.list_problems()


@router.get("/{problem_id}", response_model=ProblemPublic)
async def get_problem(
    problem_id: str,
    _: User = Depends(get_current_user),
    service: ProblemService = Depends(_service),
) -> ProblemPublic:
    try:
        return await service.get_problem_public(problem_id)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
