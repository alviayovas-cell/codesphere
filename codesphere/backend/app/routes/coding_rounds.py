from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis

from app.core.dependencies import (
    get_activity_event_repository,
    get_autosave_repository,
    get_coding_round_repository,
    get_current_user,
    get_problem_repository,
    get_round_session_repository,
    get_submission_repository,
    get_user_repository,
)
from app.database.repositories.activity_event_repository import ActivityEventRepository
from app.database.repositories.autosave_repository import AutosaveRepository
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.activity import ActivityEventCreate
from app.schemas.autosave import AutosavePublic, AutosaveRequest
from app.schemas.coding_round import CodingRoundSummary, RoundSessionPublic
from app.schemas.results import LeaderboardResponse
from app.services.coding_round_service import (
    CodingRoundService,
    RoundNotAvailableError,
    RoundNotFoundError,
    SessionNotActiveError,
    SessionNotFoundError,
)
from app.services.results_service import ResultsService
from app.workers.queue_config import get_redis_connection

router = APIRouter(prefix="/rounds", tags=["rounds"])


def _redis() -> Redis:
    return get_redis_connection()


def _service(
    round_repository: CodingRoundRepository = Depends(get_coding_round_repository),
    session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    autosave_repository: AutosaveRepository = Depends(get_autosave_repository),
    activity_event_repository: ActivityEventRepository = Depends(get_activity_event_repository),
    connection: Redis = Depends(_redis),
) -> CodingRoundService:
    return CodingRoundService(
        round_repository,
        session_repository,
        problem_repository,
        autosave_repository,
        activity_event_repository,
        connection,
    )


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


@router.get("", response_model=list[CodingRoundSummary])
async def list_rounds(
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> list[CodingRoundSummary]:
    return await service.list_rounds_for_student(current_user.id)


@router.post("/{round_id}/start", response_model=RoundSessionPublic)
async def start_round(
    round_id: str,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> RoundSessionPublic:
    try:
        session = await service.start_round(round_id, current_user.id)
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RoundNotAvailableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return await service.to_session_public(session)


@router.get("/{round_id}/session", response_model=RoundSessionPublic)
async def get_round_session(
    round_id: str,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> RoundSessionPublic:
    try:
        session = await service.get_session(round_id, current_user.id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return await service.to_session_public(session)


@router.post("/{round_id}/submit", response_model=RoundSessionPublic)
async def submit_round(
    round_id: str,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> RoundSessionPublic:
    try:
        session = await service.finish_round(round_id, current_user.id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionNotActiveError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return await service.to_session_public(session)


@router.post("/{round_id}/autosave", status_code=status.HTTP_204_NO_CONTENT)
async def autosave_code(
    round_id: str,
    payload: AutosaveRequest,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> None:
    try:
        await service.save_autosave(round_id, current_user.id, payload.problem_id, payload.code)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionNotActiveError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{round_id}/autosave/{problem_id}", response_model=AutosavePublic | None)
async def get_autosave(
    round_id: str,
    problem_id: str,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> AutosavePublic | None:
    try:
        autosave = await service.get_autosave(round_id, current_user.id, problem_id)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if autosave is None:
        return None
    return AutosavePublic(problem_id=autosave.problem_id, code=autosave.code, updated_at=autosave.updated_at)


@router.post("/{round_id}/activity", response_model=RoundSessionPublic)
async def record_activity(
    round_id: str,
    payload: ActivityEventCreate,
    current_user: User = Depends(get_current_user),
    service: CodingRoundService = Depends(_service),
) -> RoundSessionPublic:
    try:
        session = await service.record_activity(round_id, current_user.id, payload.event_type)
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return await service.to_session_public(session)


@router.get("/{round_id}/leaderboard", response_model=LeaderboardResponse)
async def get_round_leaderboard(
    round_id: str,
    current_user: User = Depends(get_current_user),
    service: ResultsService = Depends(_results_service),
) -> LeaderboardResponse:
    try:
        return await service.get_round_leaderboard(round_id, current_user.id)
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
