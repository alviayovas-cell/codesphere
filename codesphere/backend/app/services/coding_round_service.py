from datetime import datetime, timedelta, timezone

from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.models.coding_round import (
    AssessmentConfiguration,
    AssignedQuestion,
    CodingRound,
    ResultConfiguration,
)
from app.models.common import RoundStatus, SessionStatus
from app.models.round_session import RoundSession
from app.schemas.coding_round import (
    AssignedQuestionPublic,
    CodingRoundCreate,
    CodingRoundSummary,
    CodingRoundUpdate,
    RoundSessionPublic,
)


class RoundNotFoundError(Exception):
    pass


class InvalidRoundConfigError(Exception):
    pass


class RoundNotAvailableError(Exception):
    pass


class SessionNotFoundError(Exception):
    pass


class SessionNotActiveError(Exception):
    pass


class CodingRoundService:
    def __init__(
        self,
        round_repository: CodingRoundRepository,
        session_repository: RoundSessionRepository,
        problem_repository: ProblemRepository,
    ):
        self.round_repository = round_repository
        self.session_repository = session_repository
        self.problem_repository = problem_repository

    # -- admin ---------------------------------------------------------------

    async def create_round(self, payload: CodingRoundCreate) -> CodingRound:
        await self._validate_config(payload.start_time, payload.end_time, payload.problem_ids)

        return await self.round_repository.insert_one(
            CodingRound(
                title=payload.title,
                description=payload.description,
                duration_minutes=payload.duration_minutes,
                start_time=payload.start_time,
                end_time=payload.end_time,
                status=RoundStatus.DRAFT,
                problem_ids=payload.problem_ids,
                assessment_configuration=AssessmentConfiguration(
                    **payload.assessment_configuration.model_dump()
                ),
                result_configuration=ResultConfiguration(**payload.result_configuration.model_dump()),
            )
        )

    async def update_round(self, round_id: str, payload: CodingRoundUpdate) -> CodingRound:
        existing = await self.round_repository.find_by_id(round_id)
        if existing is None:
            raise RoundNotFoundError("Coding round not found")

        start_time = payload.start_time or existing.start_time
        end_time = payload.end_time or existing.end_time
        problem_ids = payload.problem_ids if payload.problem_ids is not None else existing.problem_ids
        await self._validate_config(start_time, end_time, problem_ids)

        update = payload.model_dump(by_alias=True, exclude_unset=True)
        if not update:
            return existing

        updated = await self.round_repository.update_one(round_id, update)
        if updated is None:
            raise RoundNotFoundError("Coding round not found")
        return updated

    async def delete_round(self, round_id: str) -> None:
        if await self.round_repository.find_by_id(round_id) is None:
            raise RoundNotFoundError("Coding round not found")

        sessions = await self.session_repository.find_many({"roundId": round_id}, limit=10000)
        for session in sessions:
            if session.id is not None:
                await self.session_repository.delete_one(session.id)

        await self.round_repository.delete_one(round_id)

    async def list_rounds_admin(self) -> list[CodingRound]:
        rounds = await self.round_repository.find_many(limit=1000)
        rounds.sort(key=lambda r: r.start_time)
        return rounds

    async def get_round_admin(self, round_id: str) -> CodingRound:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")
        return round_

    async def _validate_config(
        self, start_time: datetime, end_time: datetime, problem_ids: list[str]
    ) -> None:
        if end_time <= start_time:
            raise InvalidRoundConfigError("End time must be after start time")
        if not problem_ids:
            raise InvalidRoundConfigError("At least one problem must be selected")
        for problem_id in problem_ids:
            if await self.problem_repository.find_by_id(problem_id) is None:
                raise InvalidRoundConfigError(f"Problem {problem_id} not found")

    # -- student ---------------------------------------------------------------

    async def list_rounds_for_student(self, student_id: str) -> list[CodingRoundSummary]:
        rounds = await self.round_repository.find_many({"status": RoundStatus.SCHEDULED.value}, limit=1000)
        rounds.sort(key=lambda r: r.start_time)
        now = datetime.now(timezone.utc)

        summaries: list[CodingRoundSummary] = []
        for round_ in rounds:
            total_marks = 0
            for problem_id in round_.problem_ids:
                problem = await self.problem_repository.find_by_id(problem_id)
                if problem is not None:
                    total_marks += problem.marks

            session = await self.session_repository.find_one(
                {"roundId": round_.id, "studentId": student_id}
            )
            summaries.append(
                CodingRoundSummary(
                    id=round_.id,
                    title=round_.title,
                    description=round_.description,
                    duration_minutes=round_.duration_minutes,
                    start_time=round_.start_time,
                    end_time=round_.end_time,
                    question_count=len(round_.problem_ids),
                    total_marks=total_marks,
                    has_started_window=now >= round_.start_time,
                    has_ended=now > round_.end_time,
                    student_status=session.status if session else None,
                )
            )
        return summaries

    async def start_round(self, round_id: str, student_id: str) -> RoundSession:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        existing = await self.session_repository.find_one({"roundId": round_id, "studentId": student_id})
        if existing is not None:
            return await self._refresh_expiry(existing)

        if round_.status != RoundStatus.SCHEDULED:
            raise RoundNotAvailableError("This round is not currently open")

        now = datetime.now(timezone.utc)
        if now < round_.start_time:
            raise RoundNotAvailableError("This round has not started yet")
        if now > round_.end_time:
            raise RoundNotAvailableError("This round has already ended")

        assigned_questions = [
            AssignedQuestion(
                problem_id=problem_id,
                difficulty=(await self.problem_repository.find_by_id(problem_id)).difficulty,
                order=index + 1,
            )
            for index, problem_id in enumerate(round_.problem_ids)
        ]
        expires_at = min(now + timedelta(minutes=round_.duration_minutes), round_.end_time)

        session = await self.session_repository.insert_one(
            RoundSession(
                round_id=round_id,
                student_id=student_id,
                assigned_questions=assigned_questions,
                started_at=now,
                expires_at=expires_at,
                status=SessionStatus.ACTIVE,
            )
        )
        return session

    async def get_session(self, round_id: str, student_id: str) -> RoundSession:
        session = await self.session_repository.find_one({"roundId": round_id, "studentId": student_id})
        if session is None:
            raise SessionNotFoundError("You have not started this round")
        return await self._refresh_expiry(session)

    async def finish_round(self, round_id: str, student_id: str) -> RoundSession:
        session = await self.get_session(round_id, student_id)
        if session.status in (SessionStatus.SUBMITTED, SessionStatus.EXPIRED, SessionStatus.LOCKED):
            return session  # idempotent - already finalized

        if session.status != SessionStatus.ACTIVE:
            raise SessionNotActiveError("This session cannot be submitted")

        updated = await self.session_repository.update_one(session.id, {"status": SessionStatus.SUBMITTED.value})
        return updated

    async def assert_can_submit(self, round_id: str, student_id: str, problem_id: str) -> RoundSession:
        """Used by the round-aware code/submit flow: raises unless the
        session is active, unexpired, and the problem is actually assigned
        to this student's session."""
        session = await self.get_session(round_id, student_id)
        if session.status != SessionStatus.ACTIVE:
            raise SessionNotActiveError(f"This assessment session is {session.status.value} - submissions are no longer accepted")
        if not any(q.problem_id == problem_id for q in session.assigned_questions):
            raise SessionNotActiveError("That problem is not part of your assigned questions for this round")
        return session

    async def _refresh_expiry(self, session: RoundSession) -> RoundSession:
        """Lazily transitions ACTIVE -> EXPIRED once the deadline has passed.
        There's no background job for this yet (that needs autosave, which
        is Phase 10) - this check runs whenever a session is read/touched,
        which is enough to keep `status` truthful and enforce the cutoff on
        every subsequent action."""
        if session.status == SessionStatus.ACTIVE and datetime.now(timezone.utc) > session.expires_at:
            updated = await self.session_repository.update_one(
                session.id, {"status": SessionStatus.EXPIRED.value}
            )
            return updated or session
        return session

    @staticmethod
    def to_session_public(session: RoundSession) -> RoundSessionPublic:
        remaining = (session.expires_at - datetime.now(timezone.utc)).total_seconds()
        return RoundSessionPublic(
            id=session.id,
            round_id=session.round_id,
            status=session.status,
            started_at=session.started_at,
            expires_at=session.expires_at,
            remaining_seconds=max(int(remaining), 0),
            assigned_questions=[
                AssignedQuestionPublic(problem_id=q.problem_id, difficulty=q.difficulty, order=q.order)
                for q in session.assigned_questions
            ],
            violation_count=session.violation_count,
        )
