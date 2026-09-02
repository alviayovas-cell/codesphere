from datetime import datetime, timedelta, timezone

from redis import Redis
from rq import Retry

from app.core.config import settings
from app.database.repositories.activity_event_repository import ActivityEventRepository
from app.database.repositories.autosave_repository import AutosaveRepository
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.activity_event import ActivityEvent
from app.models.autosave import Autosave
from app.models.coding_round import (
    AssessmentConfiguration,
    CodingRound,
    QuestionPoolConfiguration,
    ResultConfiguration,
)
from app.models.common import ActivityEventType, Difficulty, RoundStatus, SessionStatus, SubmissionType
from app.models.round_session import RoundSession
from app.schemas.activity import SessionMonitorSummary
from app.schemas.coding_round import (
    AssignedQuestionPublic,
    CodingRoundCreate,
    CodingRoundSummary,
    CodingRoundUpdate,
    RoundSessionPublic,
)
from app.services.question_assignment_service import QuestionAssignmentService, uses_smart_assignment
from app.workers.jobs import submit_code_job
from app.workers.queue_config import QUEUE_AUTO_SUBMIT, get_queue

_LEFT_EVENT_TYPES = [ActivityEventType.VISIBILITY_HIDDEN.value, ActivityEventType.WINDOW_BLUR.value]
_RETURN_EVENT_TYPES = (ActivityEventType.VISIBILITY_RESTORED, ActivityEventType.WINDOW_FOCUS)
# Only the Page Visibility API drives violation counting - window blur/focus
# fire alongside it for the same physical tab-switch (and blur alone is
# prone to false positives, e.g. a permission prompt stealing focus), so
# treating both as separate triggers would double-count one switch. Both
# event types are still accepted and logged for the audit trail.
_VIOLATION_TRIGGER_EVENT = ActivityEventType.VISIBILITY_HIDDEN


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
        autosave_repository: AutosaveRepository,
        activity_event_repository: ActivityEventRepository,
        redis_connection: Redis,
        user_repository: UserRepository | None = None,
    ):
        self.round_repository = round_repository
        self.session_repository = session_repository
        self.problem_repository = problem_repository
        self.autosave_repository = autosave_repository
        self.activity_event_repository = activity_event_repository
        self.redis_connection = redis_connection
        self.user_repository = user_repository
        self.question_assignment_service = QuestionAssignmentService(problem_repository, session_repository)

    # -- admin ---------------------------------------------------------------

    async def create_round(self, payload: CodingRoundCreate) -> CodingRound:
        pool_config = QuestionPoolConfiguration(**payload.question_pool_configuration.model_dump())
        await self._validate_config(payload.start_time, payload.end_time, payload.problem_ids, pool_config)

        return await self.round_repository.insert_one(
            CodingRound(
                title=payload.title,
                description=payload.description,
                duration_minutes=payload.duration_minutes,
                start_time=payload.start_time,
                end_time=payload.end_time,
                status=RoundStatus.DRAFT,
                problem_ids=payload.problem_ids,
                question_pool_configuration=pool_config,
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
        pool_config = (
            QuestionPoolConfiguration(**payload.question_pool_configuration.model_dump())
            if payload.question_pool_configuration is not None
            else existing.question_pool_configuration
        )
        await self._validate_config(start_time, end_time, problem_ids, pool_config)

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
        self,
        start_time: datetime,
        end_time: datetime,
        problem_ids: list[str],
        pool_config: QuestionPoolConfiguration,
    ) -> None:
        if end_time <= start_time:
            raise InvalidRoundConfigError("End time must be after start time")
        if not problem_ids:
            raise InvalidRoundConfigError("At least one problem must be selected")
        for problem_id in problem_ids:
            if await self.problem_repository.find_by_id(problem_id) is None:
                raise InvalidRoundConfigError(f"Problem {problem_id} not found")

        pool_errors = await self.question_assignment_service.validate_pool_can_satisfy(
            problem_ids, pool_config
        )
        if pool_errors:
            raise InvalidRoundConfigError("; ".join(pool_errors))

    # -- student ---------------------------------------------------------------

    async def list_rounds_for_student(self, student_id: str) -> list[CodingRoundSummary]:
        rounds = await self.round_repository.find_many({"status": RoundStatus.SCHEDULED.value}, limit=1000)
        rounds.sort(key=lambda r: r.start_time)
        now = datetime.now(timezone.utc)

        summaries: list[CodingRoundSummary] = []
        for round_ in rounds:
            question_count, total_marks = await self._estimate_question_count_and_marks(round_)

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
                    question_count=question_count,
                    total_marks=total_marks,
                    has_started_window=now >= round_.start_time,
                    has_ended=now > round_.end_time,
                    student_status=session.status if session else None,
                )
            )
        return summaries

    async def _estimate_question_count_and_marks(self, round_: CodingRound) -> tuple[int, int]:
        """For the pre-start round listing: with smart assignment active,
        each student's actual combination varies, so this reports the
        configured count and an estimate of total marks (using the first N
        pool problems per difficulty, in list order - a representative
        combination, not necessarily what any one student gets)."""
        config = round_.question_pool_configuration
        if not uses_smart_assignment(config):
            total_marks = 0
            for problem_id in round_.problem_ids:
                problem = await self.problem_repository.find_by_id(problem_id)
                if problem is not None:
                    total_marks += problem.marks
            return len(round_.problem_ids), total_marks

        buckets = await self.question_assignment_service.group_pool_by_difficulty(round_.problem_ids)
        requested = [
            (config.easy_questions, buckets[Difficulty.EASY]),
            (config.medium_questions, buckets[Difficulty.MEDIUM]),
            (config.hard_questions, buckets[Difficulty.HARD]),
        ]
        question_count = 0
        total_marks = 0
        for count, pool in requested:
            for problem_id in pool[:count]:
                problem = await self.problem_repository.find_by_id(problem_id)
                if problem is not None:
                    question_count += 1
                    total_marks += problem.marks
        return question_count, total_marks

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

        assigned_questions = await self.question_assignment_service.assign_questions(round_)
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

        updated = await self.session_repository.update_one(
            session.id,
            {"status": SessionStatus.SUBMITTED.value, "completedAt": datetime.now(timezone.utc)},
        )
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
        """Lazily transitions ACTIVE -> EXPIRED once the deadline has passed
        - there's no background scheduler, so this runs whenever a session
        is read/touched, which is enough to keep `status` truthful and
        enforce the cutoff on every subsequent action. When it does expire,
        this also completes the spec's "on expiry: auto-submit the latest
        autosaved code for every assigned question" step."""
        if session.status == SessionStatus.ACTIVE and datetime.now(timezone.utc) > session.expires_at:
            return await self._auto_submit_and_transition(session, SessionStatus.EXPIRED, reason="expired")
        return session

    # -- autosave --------------------------------------------------------------

    async def save_autosave(self, round_id: str, student_id: str, problem_id: str, code: str) -> Autosave:
        session = await self.assert_can_submit(round_id, student_id, problem_id)
        return await self.autosave_repository.upsert_one(
            {"sessionId": session.id, "problemId": problem_id},
            {"code": code, "updatedAt": datetime.now(timezone.utc)},
        )

    async def get_autosave(self, round_id: str, student_id: str, problem_id: str) -> Autosave | None:
        session = await self.get_session(round_id, student_id)
        return await self.autosave_repository.find_one({"sessionId": session.id, "problemId": problem_id})

    # -- assessment monitoring ---------------------------------------------

    async def record_activity(self, round_id: str, student_id: str, event_type: ActivityEventType) -> RoundSession:
        """Logs a Page Visibility / focus event. Violation counting and the
        grace period are two deliberately separate mechanisms:

        - Every `visibility_hidden` (tab/window actually leaves view) counts
          as a violation THE MOMENT it happens - no minimum away-duration,
          so even a one-second switch is recorded and the student sees a
          warning the instant they come back. This is the primary fix for
          "the warning only appeared after staying away a while": that used
          to be gated on the grace period at return time; it no longer is.
        - The grace period no longer decides *whether* something counts as
          a violation - it only bounds how long the student can stay away
          in a single absence before auto-submit fires regardless of
          violation count (see check_prolonged_absence, driven by a
          client-side timer started the moment the tab is hidden).
        `window_blur`/`window_focus` are still accepted and logged (for the
        audit trail / secondary monitoring) but never independently trigger
        a violation - they fire alongside visibilitychange for the same
        physical switch, so counting both would double-count one switch.

        hiddenAt/visibleAt/durationMs are computed here from the server's
        own event timestamps (never trusted from the client, same as
        violation counts) and stored on the event's metadata: for a
        left-type event, hiddenAt is just this event's own timestamp; for a
        return-type event, it's looked up from the most recent left event
        so the round trip's duration is recorded even for a ~100ms switch."""
        session = await self.get_session(round_id, student_id)  # also applies lazy expiry
        now = datetime.now(timezone.utc)

        metadata: dict = {}
        if event_type.value in _LEFT_EVENT_TYPES:
            metadata = {"hiddenAt": now.isoformat()}
        elif event_type in _RETURN_EVENT_TYPES:
            left_events = await self.activity_event_repository.find_many(
                {"sessionId": session.id, "eventType": {"$in": _LEFT_EVENT_TYPES}}, limit=1000
            )
            if left_events:
                last_left = max(left_events, key=lambda e: e.timestamp)
                metadata = {
                    "hiddenAt": last_left.timestamp.isoformat(),
                    "visibleAt": now.isoformat(),
                    "durationMs": round((now - last_left.timestamp).total_seconds() * 1000),
                }

        await self.activity_event_repository.insert_one(
            ActivityEvent(session_id=session.id, event_type=event_type, timestamp=now, metadata=metadata)
        )

        if session.status != SessionStatus.ACTIVE or event_type != _VIOLATION_TRIGGER_EVENT:
            return session

        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            return session
        config = round_.assessment_configuration

        new_violation_count = session.violation_count + 1
        updated = await self.session_repository.update_one(session.id, {"violationCount": new_violation_count})
        session = updated or session

        await self.activity_event_repository.insert_one(
            ActivityEvent(
                session_id=session.id,
                event_type=ActivityEventType.WARNING,
                metadata={
                    "reason": "left_assessment_tab",
                    "violationNumber": new_violation_count,
                    "maxViolations": config.max_violations,
                },
            )
        )

        if new_violation_count > config.max_violations and config.auto_submit_enabled:
            session = await self._auto_submit_and_transition(
                session, SessionStatus.LOCKED, reason="violation_limit_exceeded"
            )

        return session

    async def check_prolonged_absence(self, round_id: str, student_id: str) -> RoundSession:
        """Driven by a client-side timer started the instant the tab is
        hidden, firing `grace_period_seconds` later ONLY if the tab is
        still hidden at that point (see the frontend's visibilitychange
        handler). The server re-verifies independently rather than trusting
        the client outright: if a `visibility_restored` event was logged
        after the most recent `visibility_hidden`, the student came back in
        time and nothing happens. Otherwise, and only if the round's policy
        has auto-submit enabled, this locks the session exactly like
        exceeding the violation count does - a single prolonged absence is
        its own auto-submit trigger, independent of violation count."""
        session = await self.get_session(round_id, student_id)
        if session.status != SessionStatus.ACTIVE:
            return session

        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None or not round_.assessment_configuration.auto_submit_enabled:
            return session

        events = await self.activity_event_repository.find_many(
            {"sessionId": session.id, "eventType": {"$in": [*_LEFT_EVENT_TYPES, *[t.value for t in _RETURN_EVENT_TYPES]]}},
            limit=1000,
        )
        if not events:
            return session

        last_left = max((e for e in events if e.event_type.value in _LEFT_EVENT_TYPES), key=lambda e: e.timestamp, default=None)
        if last_left is None:
            return session
        returned_since = any(e.event_type in _RETURN_EVENT_TYPES and e.timestamp > last_left.timestamp for e in events)
        if returned_since:
            return session  # came back before the grace timer fired - nothing to do

        away_seconds = (datetime.now(timezone.utc) - last_left.timestamp).total_seconds()
        if away_seconds < round_.assessment_configuration.grace_period_seconds:
            return session  # client timer fired early (clock drift) - not actually over yet

        session = await self._auto_submit_and_transition(session, SessionStatus.LOCKED, reason="prolonged_absence")
        await self.activity_event_repository.insert_one(
            ActivityEvent(
                session_id=session.id,
                event_type=ActivityEventType.WARNING,
                metadata={"reason": "prolonged_absence", "awaySeconds": round(away_seconds, 1)},
            )
        )
        return session

    async def _auto_submit_and_transition(
        self, session: RoundSession, target_status: SessionStatus, reason: str
    ) -> RoundSession:
        """Shared by every auto-submit trigger (time expiry, violation
        count exceeded, a single prolonged absence past the grace period):
        for each assigned question, enqueue the latest autosaved code (if
        any) onto the auto_submit priority tier, then transition the
        session."""
        for question in session.assigned_questions:
            autosave = await self.autosave_repository.find_one(
                {"sessionId": session.id, "problemId": question.problem_id}
            )
            if autosave is None:
                continue  # nothing was ever saved for this question - leave it ungraded

            queue = get_queue(QUEUE_AUTO_SUBMIT, self.redis_connection)
            queue.enqueue(
                submit_code_job,
                args=(session.student_id, question.problem_id, autosave.code, session.round_id, SubmissionType.AUTO_SUBMIT.value),
                job_timeout=settings.submit_job_timeout_seconds,
                result_ttl=settings.job_result_ttl_seconds,
                retry=Retry(max=1),
                meta={"student_id": session.student_id},
            )

        updated = await self.session_repository.update_one(
            session.id,
            {"status": target_status.value, "completedAt": datetime.now(timezone.utc)},
        )

        await self.activity_event_repository.insert_one(
            ActivityEvent(
                session_id=session.id,
                event_type=ActivityEventType.AUTO_SUBMIT,
                metadata={"reason": reason},
            )
        )

        return updated or session

    # -- admin monitoring / override -----------------------------------------

    async def list_sessions_for_round(self, round_id: str) -> list[SessionMonitorSummary]:
        if self.user_repository is None:
            raise RuntimeError("list_sessions_for_round requires a user_repository")

        sessions = await self.session_repository.find_many({"roundId": round_id}, limit=10000)
        # One batch lookup instead of one find_by_id per session - matters
        # once a round has dozens of students (Phase 14 load testing).
        students = {u.id: u for u in await self.user_repository.find_by_ids([s.student_id for s in sessions])}
        summaries: list[SessionMonitorSummary] = []
        for session in sessions:
            student = students.get(session.student_id)
            summaries.append(
                SessionMonitorSummary(
                    session_id=session.id,
                    student_id=session.student_id,
                    student_name=student.name if student else "Unknown student",
                    student_register_number=student.register_number if student else "-",
                    status=session.status,
                    violation_count=session.violation_count,
                    started_at=session.started_at,
                    expires_at=session.expires_at,
                )
            )
        summaries.sort(key=lambda s: s.started_at)
        return summaries

    async def get_session_activity(self, session_id: str) -> list[ActivityEvent]:
        events = await self.activity_event_repository.find_many({"sessionId": session_id}, limit=10000)
        events.sort(key=lambda e: e.timestamp)
        return events

    async def admin_unlock_session(self, session_id: str) -> RoundSession:
        """Recovers a session from a false-positive auto-submit/lock (spec
        section 18): reopens it for a fresh attempt window and clears the
        violation count, so the student can keep working and resubmit."""
        session = await self.session_repository.find_by_id(session_id)
        if session is None:
            raise SessionNotFoundError("Session not found")

        round_ = await self.round_repository.find_by_id(session.round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        now = datetime.now(timezone.utc)
        new_expiry = min(now + timedelta(minutes=round_.duration_minutes), round_.end_time)

        updated = await self.session_repository.update_one(
            session_id,
            {"status": SessionStatus.ACTIVE.value, "violationCount": 0, "expiresAt": new_expiry, "completedAt": None},
        )

        await self.activity_event_repository.insert_one(
            ActivityEvent(
                session_id=session_id,
                event_type=ActivityEventType.WARNING,
                metadata={"reason": "admin_unlock"},
            )
        )

        return updated or session

    async def to_session_public(self, session: RoundSession) -> RoundSessionPublic:
        remaining = (session.expires_at - datetime.now(timezone.utc)).total_seconds()
        round_ = await self.round_repository.find_by_id(session.round_id)
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
            max_violations=round_.assessment_configuration.max_violations if round_ else 0,
            grace_period_seconds=round_.assessment_configuration.grace_period_seconds if round_ else 0,
        )
