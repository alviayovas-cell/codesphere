from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_coding_round_repository,
    get_current_user,
    get_problem_repository,
    get_round_session_repository,
    get_submission_repository,
    get_user_repository,
)
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.results import RoundResultDetail, RoundResultSummary
from app.services.coding_round_service import RoundNotFoundError, SessionNotFoundError
from app.services.results_service import ResultsService

router = APIRouter(tags=["results"])


def _results_service(
    round_repository: CodingRoundRepository = Depends(get_coding_round_repository),
    session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    submission_repository: SubmissionRepository = Depends(get_submission_repository),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    user_repository: UserRepository = Depends(get_user_repository),
) -> ResultsService:
    return ResultsService(
        round_repository, session_repository, submission_repository, problem_repository, user_repository
    )


@router.get("/results", response_model=list[RoundResultSummary])
async def get_my_results(
    current_user: User = Depends(get_current_user),
    service: ResultsService = Depends(_results_service),
) -> list[RoundResultSummary]:
    return await service.get_student_results(current_user.id)


@router.get("/results/{round_id}", response_model=RoundResultDetail)
async def get_my_round_result(
    round_id: str,
    current_user: User = Depends(get_current_user),
    service: ResultsService = Depends(_results_service),
) -> RoundResultDetail:
    try:
        return await service.get_round_result_detail(round_id, current_user.id)
    except (RoundNotFoundError, SessionNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
