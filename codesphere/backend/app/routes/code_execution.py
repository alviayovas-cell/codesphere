import logging
import time

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from rq import Retry
from rq.job import Job

from app.core.config import settings
from app.core.dependencies import (
    enforce_run_rate_limit,
    enforce_submit_rate_limit,
    get_activity_event_repository,
    get_autosave_repository,
    get_coding_round_repository,
    get_current_user,
    get_problem_repository,
    get_round_session_repository,
)
from app.database.repositories.activity_event_repository import ActivityEventRepository
from app.database.repositories.autosave_repository import AutosaveRepository
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.models.user import User
from app.schemas.code_execution import (
    JobEnqueuedResponse,
    JobStatusResponse,
    RunCodeRequest,
    SubmitCodeRequest,
)
from app.services.coding_round_service import CodingRoundService, SessionNotActiveError, SessionNotFoundError
from app.workers.jobs import run_code_job, submit_code_job
from app.workers.queue_config import (
    QUEUE_FINAL_SUBMIT,
    QUEUE_RUN_CODE,
    get_queue,
    get_redis_connection,
)

router = APIRouter(prefix="/code", tags=["code"])
logger = logging.getLogger(__name__)


def _redis() -> Redis:
    return get_redis_connection()


async def _has_round_access(
    round_session_repository: RoundSessionRepository, student_id: str, problem_id: str
) -> bool:
    """An assessment-only problem is reachable outside a round context only
    once this student has actually been assigned it by starting a round -
    same rule as ProblemService.get_problem_public, applied here so a
    guessed/known problem ID can't be Run/Submit-ed in practice mode
    (roundId omitted) before or without ever starting that round."""
    sessions = await round_session_repository.find_many({"studentId": student_id}, limit=1000)
    return any(q.problem_id == problem_id for session in sessions for q in session.assigned_questions)


@router.post("/run", response_model=JobEnqueuedResponse, dependencies=[Depends(enforce_run_rate_limit)])
async def run_code(
    payload: RunCodeRequest,
    current_user: User = Depends(get_current_user),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    round_session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    connection: Redis = Depends(_redis),
) -> JobEnqueuedResponse:
    request_received_at = time.perf_counter()
    problem = await problem_repository.find_by_id(payload.problem_id)
    if problem is None or (
        problem.is_assessment_only
        and not await _has_round_access(round_session_repository, current_user.id, payload.problem_id)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    queue = get_queue(QUEUE_RUN_CODE, connection)
    job = queue.enqueue(
        run_code_job,
        args=(current_user.id, payload.problem_id, payload.code, payload.stdin),
        job_timeout=settings.run_job_timeout_seconds,
        result_ttl=settings.job_result_ttl_seconds,
        retry=Retry(max=1),
        meta={"student_id": current_user.id},
    )
    logger.info(
        "run_code enqueued: job_id=%s student_id=%s enqueue_time=%.3fs",
        job.id, current_user.id, time.perf_counter() - request_received_at,
    )
    return JobEnqueuedResponse(job_id=job.id)


@router.post(
    "/submit", response_model=JobEnqueuedResponse, dependencies=[Depends(enforce_submit_rate_limit)]
)
async def submit_code(
    payload: SubmitCodeRequest,
    current_user: User = Depends(get_current_user),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    round_repository: CodingRoundRepository = Depends(get_coding_round_repository),
    session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    autosave_repository: AutosaveRepository = Depends(get_autosave_repository),
    activity_event_repository: ActivityEventRepository = Depends(get_activity_event_repository),
    connection: Redis = Depends(_redis),
) -> JobEnqueuedResponse:
    request_received_at = time.perf_counter()
    problem = await problem_repository.find_by_id(payload.problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    if (
        problem.is_assessment_only
        and payload.round_id is None
        and not await _has_round_access(session_repository, current_user.id, payload.problem_id)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    if payload.round_id is not None:
        round_service = CodingRoundService(
            round_repository,
            session_repository,
            problem_repository,
            autosave_repository,
            activity_event_repository,
            connection,
        )
        try:
            await round_service.assert_can_submit(payload.round_id, current_user.id, payload.problem_id)
        except SessionNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except SessionNotActiveError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    queue = get_queue(QUEUE_FINAL_SUBMIT, connection)
    job = queue.enqueue(
        submit_code_job,
        args=(current_user.id, payload.problem_id, payload.code, payload.round_id),
        job_timeout=settings.submit_job_timeout_seconds,
        result_ttl=settings.job_result_ttl_seconds,
        retry=Retry(max=1),
        meta={"student_id": current_user.id},
    )
    logger.info(
        "submit_code enqueued: job_id=%s student_id=%s round_id=%s enqueue_time=%.3fs",
        job.id, current_user.id, payload.round_id, time.perf_counter() - request_received_at,
    )
    return JobEnqueuedResponse(job_id=job.id)


_RQ_STATUS_MAP = {
    "queued": "queued",
    "scheduled": "queued",
    "deferred": "queued",
    "started": "processing",
    "finished": "completed",
    "failed": "failed",
    "stopped": "failed",
    "canceled": "failed",
}


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    connection: Redis = Depends(_redis),
) -> JobStatusResponse:
    try:
        job = Job.fetch(job_id, connection=connection)
    except Exception as exc:  # rq raises NoSuchJobError, which isn't worth importing just for this
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found") from exc

    owner_id = (job.meta or {}).get("student_id")
    if owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your job")

    rq_status = job.get_status(refresh=True)
    mapped_status = _RQ_STATUS_MAP.get(rq_status, "queued")

    result = None
    error = None
    if mapped_status == "completed":
        if isinstance(job.result, dict) and "error" in job.result:
            mapped_status = "failed"
            error = job.result["error"]
        else:
            result = job.result
    elif mapped_status == "failed":
        error = str(job.exc_info) if job.exc_info else "The job failed unexpectedly."

    return JobStatusResponse(job_id=job.id, status=mapped_status, result=result, error=error)
