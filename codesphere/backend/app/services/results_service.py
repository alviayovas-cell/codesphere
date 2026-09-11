from datetime import datetime, timezone

from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.coding_round import CodingRound
from app.models.common import LeaderboardVisibility, SessionStatus, SubmissionType, UserRole
from app.models.problem import Problem
from app.models.round_session import RoundSession
from app.models.submission import Submission
from app.models.user import User
from app.schemas.results import (
    AdminRoundResultEntry,
    LeaderboardEntry,
    LeaderboardResponse,
    QuestionResultPublic,
    RoundResultDetail,
    RoundResultSummary,
)
from app.services.coding_round_service import RoundNotFoundError, SessionNotFoundError

_FINISHED_STATUSES = (SessionStatus.SUBMITTED, SessionStatus.EXPIRED, SessionStatus.LOCKED)
_GRADED_SUBMISSION_TYPES = [SubmissionType.SUBMIT.value, SubmissionType.AUTO_SUBMIT.value]


class ResultsService:
    def __init__(
        self,
        round_repository: CodingRoundRepository,
        session_repository: RoundSessionRepository,
        submission_repository: SubmissionRepository,
        problem_repository: ProblemRepository,
        user_repository: UserRepository,
    ):
        self.round_repository = round_repository
        self.session_repository = session_repository
        self.submission_repository = submission_repository
        self.problem_repository = problem_repository
        self.user_repository = user_repository

    # -- batch loading (Phase 14: these replace what used to be N/N*M
    # per-student, per-question DB round trips - see README's Phase 14
    # notes for the load-test numbers that motivated this) -----------------

    async def _load_problems(self, problem_ids: list[str]) -> dict[str, Problem]:
        unique_ids = list({pid for pid in problem_ids})
        return {p.id: p for p in await self.problem_repository.find_by_ids(unique_ids)}

    async def _load_students(self, student_ids: list[str]) -> dict[str, User]:
        unique_ids = list({sid for sid in student_ids})
        return {u.id: u for u in await self.user_repository.find_by_ids(unique_ids)}

    async def _load_best_submissions_for_round(self, round_id: str) -> dict[tuple[str, str], Submission]:
        """One query for the whole round: every graded (Submit/Auto-Submit)
        submission any student made in it, reduced to the single
        best-scoring one per (student, problem) pair - the same
        best-attempt-wins rule as before, just computed in memory instead
        of with a separate query per (student, question)."""
        submissions = await self.submission_repository.find_many(
            {"roundId": round_id, "submissionType": {"$in": _GRADED_SUBMISSION_TYPES}}, limit=200000
        )
        best: dict[tuple[str, str], Submission] = {}
        for submission in submissions:
            key = (submission.student_id, submission.problem_id)
            current = best.get(key)
            if current is None or (submission.score, submission.submitted_at) > (current.score, current.submitted_at):
                best[key] = submission
        return best

    # -- scoring -------------------------------------------------------------

    def _score_session(
        self,
        session: RoundSession,
        problems: dict[str, Problem],
        best_submissions: dict[tuple[str, str], Submission],
    ) -> tuple[int, int, list[QuestionResultPublic]]:
        """Returns (score, total_marks, per-question breakdown) for one
        session, purely from already-loaded lookup tables - no DB calls."""
        results: list[QuestionResultPublic] = []
        score = 0
        total_marks = 0
        for question in session.assigned_questions:
            problem = problems.get(question.problem_id)
            marks = problem.marks if problem else 0
            total_marks += marks

            best = best_submissions.get((session.student_id, question.problem_id))
            q_score = best.score if best else 0
            score += q_score
            results.append(
                QuestionResultPublic(
                    problem_id=question.problem_id,
                    title=problem.title if problem else "Unknown problem",
                    difficulty=question.difficulty,
                    marks=marks,
                    attempted=best is not None,
                    verdict=best.verdict.value if best else None,
                    score=q_score,
                    passed_tests=best.passed_tests if best else 0,
                    total_tests=best.total_tests if best else 0,
                )
            )
        return score, total_marks, results

    # -- availability ----------------------------------------------------------

    def _results_available_to_student(self, round_: CodingRound, session: RoundSession) -> bool:
        """Own-results gate (spec section 19): once you've finished, you can
        see your own score early if the admin opted in via
        showScoreImmediately - otherwise everyone waits until the round's
        time window has fully closed, so no one can infer how hard/easy it
        was from an early finisher's score."""
        if session.status not in _FINISHED_STATUSES:
            return False
        if datetime.now(timezone.utc) >= round_.end_time:
            return True
        return round_.result_configuration.show_score_immediately

    def _leaderboard_available(self, round_: CodingRound) -> bool:
        """The leaderboard reveals *other* students' standing, so by
        default it waits for the round's window to fully close -
        showScoreImmediately only ever applies to a student's own result.
        A round can opt out of that wait via
        resultConfiguration.leaderboardVisibility == "immediate", in
        which case the leaderboard opens the moment the round's window
        actually starts (not before - "immediate" means "don't make me
        wait for the end", not "always open") and simply stays available
        after end_time too, same as the default mode already does."""
        now = datetime.now(timezone.utc)
        if round_.result_configuration.leaderboard_visibility == LeaderboardVisibility.IMMEDIATE:
            return now >= round_.start_time
        return now >= round_.end_time

    def _leaderboard_is_live(self, round_: CodingRound) -> bool:
        return round_.result_configuration.leaderboard_visibility == LeaderboardVisibility.IMMEDIATE

    async def _load_round_context(
        self, round_id: str, sessions: list[RoundSession]
    ) -> tuple[dict[str, Problem], dict[tuple[str, str], Submission]]:
        """Loads everything needed to score every given session with exactly
        two queries total (problems, submissions) regardless of student
        count. Pass every session whose questions need to resolve to a real
        problem (including in-progress ones for the admin view) - a session
        left out here just scores as all-zero/unknown, it won't error."""
        problems = await self._load_problems([q.problem_id for s in sessions for q in s.assigned_questions])
        best_submissions = await self._load_best_submissions_for_round(round_id)
        return problems, best_submissions

    def _rank_sessions(
        self,
        sessions: list[RoundSession],
        problems: dict[str, Problem],
        best_submissions: dict[tuple[str, str], Submission],
    ) -> list[tuple[RoundSession, int, int]]:
        """Pure in-memory ranking (no DB calls) by score desc, completion
        time asc (faster finish wins ties) - rank is the 1-based position."""
        scored = [
            (session, *self._score_session(session, problems, best_submissions)[:2])
            for session in sessions
        ]
        scored.sort(key=lambda t: (-t[1], t[0].completed_at or datetime.max.replace(tzinfo=timezone.utc)))
        return scored

    # -- student-facing --------------------------------------------------------

    async def get_student_results(self, student_id: str) -> list[RoundResultSummary]:
        sessions = await self.session_repository.find_many({"studentId": student_id}, limit=1000)
        finished = [s for s in sessions if s.status in _FINISHED_STATUSES]

        summaries: list[RoundResultSummary] = []
        for session in finished:
            round_ = await self.round_repository.find_by_id(session.round_id)
            if round_ is None:
                continue

            available = self._results_available_to_student(round_, session)
            all_round_sessions = [
                s
                for s in await self.session_repository.find_many({"roundId": round_.id}, limit=10000)
                if s.status in _FINISHED_STATUSES
            ]
            problems, best_submissions = await self._load_round_context(round_.id, all_round_sessions)
            ranked = self._rank_sessions(all_round_sessions, problems, best_submissions)
            score, total_marks, _ = self._score_session(session, problems, best_submissions)

            rank = None
            total_participants = len(ranked) if available else None
            if available:
                for position, (ranked_session, _, _) in enumerate(ranked, start=1):
                    if ranked_session.student_id == student_id:
                        rank = position
                        break

            summaries.append(
                RoundResultSummary(
                    round_id=round_.id,
                    round_title=round_.title,
                    status=session.status,
                    completed_at=session.completed_at,
                    total_marks=total_marks,
                    results_available=available,
                    score=score if available else None,
                    rank=rank,
                    total_participants=total_participants,
                )
            )

        summaries.sort(key=lambda s: s.completed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return summaries

    async def get_round_result_detail(self, round_id: str, student_id: str) -> RoundResultDetail:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        session = await self.session_repository.find_one({"roundId": round_id, "studentId": student_id})
        if session is None or session.status not in _FINISHED_STATUSES:
            raise SessionNotFoundError("You haven't completed this round yet")

        available = self._results_available_to_student(round_, session)
        all_finished = [
            s
            for s in await self.session_repository.find_many({"roundId": round_id}, limit=10000)
            if s.status in _FINISHED_STATUSES
        ]
        problems, best_submissions = await self._load_round_context(round_id, all_finished)
        ranked = self._rank_sessions(all_finished, problems, best_submissions)
        score, total_marks, questions = self._score_session(session, problems, best_submissions)

        rank = None
        total_participants = len(ranked) if available else None
        if available:
            for position, (ranked_session, _, _) in enumerate(ranked, start=1):
                if ranked_session.student_id == student_id:
                    rank = position
                    break

        return RoundResultDetail(
            round_id=round_.id,
            round_title=round_.title,
            status=session.status,
            completed_at=session.completed_at,
            total_marks=total_marks,
            results_available=available,
            score=score if available else None,
            rank=rank,
            total_participants=total_participants,
            questions=questions if available else None,
        )

    async def get_round_leaderboard(self, round_id: str, student_id: str) -> LeaderboardResponse:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        if not self._leaderboard_available(round_):
            return LeaderboardResponse(
                results_available=False, entries=[], is_live=self._leaderboard_is_live(round_)
            )

        return await self._build_leaderboard(round_, highlight_student_id=student_id)

    async def get_round_leaderboard_admin(self, round_id: str) -> LeaderboardResponse:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")
        return await self._build_leaderboard(round_, highlight_student_id=None)

    async def _build_leaderboard(
        self, round_: CodingRound, highlight_student_id: str | None
    ) -> LeaderboardResponse:
        """Every student is a row here, not just the ones who finished -
        there's no per-round enrollment list anywhere in this schema, so
        "eligible for this round" is the same student roster the admin
        Student Management page shows. Students with no session (never
        started) or a still-in-progress one show up with score 0 and no
        completion time instead of being silently absent."""
        sessions = await self.session_repository.find_many({"roundId": round_.id}, limit=10000)
        session_by_student = {s.student_id: s for s in sessions}

        eligible_students = await self.user_repository.find_many(
            {"role": UserRole.STUDENT.value}, limit=10000
        )
        students_by_id = {u.id: u for u in eligible_students}
        # A session can in principle belong to someone no longer in that
        # roster (e.g. their role changed after playing the round) - keep
        # them visible too, via one extra batch lookup, rather than letting
        # them silently vanish from a leaderboard they already have a
        # result on.
        extra_ids = [sid for sid in session_by_student if sid not in students_by_id]
        if extra_ids:
            for extra_student in await self.user_repository.find_by_ids(extra_ids):
                students_by_id[extra_student.id] = extra_student

        problems, best_submissions = await self._load_round_context(round_.id, sessions)
        # A student with no session yet has no assigned_questions to size a
        # denominator from - fall back to the round's full problem pool so
        # their row still reads as "0 / N" instead of "0 / 0".
        pool_problems = await self._load_problems(round_.problem_ids)
        pool_total_marks = sum(p.marks for p in pool_problems.values())

        rows: list[tuple[str, int, int, datetime | None]] = []
        for student_id in students_by_id:
            session = session_by_student.get(student_id)
            if session is not None:
                score, total_marks, _ = self._score_session(session, problems, best_submissions)
                completed_at = session.completed_at if session.status in _FINISHED_STATUSES else None
            else:
                score, total_marks, completed_at = 0, pool_total_marks, None
            rows.append((student_id, score, total_marks, completed_at))

        # Same ranking rule as before (score desc, faster finish wins ties),
        # plus a register-number tiebreaker so students tied at zero (or
        # any other score) still get distinct, deterministic, stable ranks
        # instead of sharing one.
        rows.sort(
            key=lambda r: (
                -r[1],
                r[3] or datetime.max.replace(tzinfo=timezone.utc),
                students_by_id[r[0]].register_number,
            )
        )

        entries = [
            LeaderboardEntry(
                rank=position,
                student_id=student_id,
                student_name=students_by_id[student_id].name,
                student_register_number=students_by_id[student_id].register_number,
                score=score,
                total_marks=total_marks,
                completed_at=completed_at,
                is_you=student_id == highlight_student_id,
            )
            for position, (student_id, score, total_marks, completed_at) in enumerate(rows, start=1)
        ]
        return LeaderboardResponse(
            results_available=True, entries=entries, is_live=self._leaderboard_is_live(round_)
        )

    # -- admin -------------------------------------------------------------

    async def get_admin_round_results(self, round_id: str) -> list[AdminRoundResultEntry]:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        sessions = await self.session_repository.find_many({"roundId": round_id}, limit=10000)
        finished = [s for s in sessions if s.status in _FINISHED_STATUSES]
        # Load problems/submissions from *every* session (including
        # in-progress ones, for a live best-so-far score), not just the
        # finished ones being ranked - an in-progress session can easily be
        # working on a question no finished session touched yet.
        problems, best_submissions = await self._load_round_context(round_id, sessions)
        ranked = self._rank_sessions(finished, problems, best_submissions)
        rank_by_session_id = {session.id: position for position, (session, _, _) in enumerate(ranked, start=1)}
        students = await self._load_students([session.student_id for session in sessions])

        entries: list[AdminRoundResultEntry] = []
        for session in sessions:
            student = students.get(session.student_id)
            score, total_marks, _ = self._score_session(session, problems, best_submissions)
            entries.append(
                AdminRoundResultEntry(
                    student_id=session.student_id,
                    student_name=student.name if student else "Unknown student",
                    student_register_number=student.register_number if student else "-",
                    status=session.status,
                    score=score,
                    total_marks=total_marks,
                    rank=rank_by_session_id.get(session.id),
                    violation_count=session.violation_count,
                    completed_at=session.completed_at,
                )
            )

        entries.sort(key=lambda e: (e.rank is None, e.rank if e.rank is not None else 0))
        return entries
