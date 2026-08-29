from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_coding_round_repository,
    get_current_user,
    get_problem_repository,
    get_round_session_repository,
)
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.models.user import User
from app.schemas.coding_round import CodingRoundSummary, RoundSessionPublic
from app.services.coding_round_service import (
    CodingRoundService,
    RoundNotAvailableError,
    RoundNotFoundError,
    SessionNotActiveError,
    SessionNotFoundError,
)

router = APIRouter(prefix="/rounds", tags=["rounds"])


def _service(
    round_repository: CodingRoundRepository = Depends(get_coding_round_repository),
    session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
) -> CodingRoundService:
    return CodingRoundService(round_repository, session_repository, problem_repository)


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

    return CodingRoundService.to_session_public(session)


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

    return CodingRoundService.to_session_public(session)


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

    return CodingRoundService.to_session_public(session)
