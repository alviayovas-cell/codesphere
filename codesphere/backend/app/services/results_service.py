from datetime import datetime, timezone

from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.coding_round import CodingRound
from app.models.common import SessionStatus, SubmissionType
from app.models.problem import Problem
from app.models.round_session import RoundSession
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

    # -- scoring -------------------------------------------------------------

    async def _load_problems(self, problem_ids: list[str]) -> dict[str, Problem]:
        problems: dict[str, Problem] = {}
        for problem_id in set(problem_ids):
            problem = await self.problem_repository.find_by_id(problem_id)
            if problem is not None:
                problems[problem_id] = problem
        return problems

    async def _best_submission_score(
        self, student_id: str, round_id: str, problem_id: str
    ) -> tuple[int, int, int, str | None]:
        """Returns (score, passedTests, totalTests, verdict) from the
        highest-scoring graded (Submit/Auto-Submit, never Run) submission
        the student made for this problem within this round - competitive
        judges reward your best attempt, not your last one."""
        submissions = await self.submission_repository.find_many(
            {
                "studentId": student_id,
                "roundId": round_id,
                "problemId": problem_id,
                "submissionType": {"$in": _GRADED_SUBMISSION_TYPES},
            },
            limit=1000,
        )
        if not submissions:
            return 0, 0, 0, None

        best = max(submissions, key=lambda s: (s.score, s.submitted_at))
        return best.score, best.passed_tests, best.total_tests, best.verdict.value

    async def _score_session(
        self, session: RoundSession, problems: dict[str, Problem] | None = None
    ) -> tuple[int, int, list[QuestionResultPublic]]:
        """Returns (score, total_marks, per-question breakdown) for one
        session, using each question's best graded attempt."""
        if problems is None:
            problems = await self._load_problems([q.problem_id for q in session.assigned_questions])

        results: list[QuestionResultPublic] = []
        score = 0
        total_marks = 0
        for question in session.assigned_questions:
            problem = problems.get(question.problem_id)
            marks = problem.marks if problem else 0
            total_marks += marks

            q_score, passed, total, verdict = await self._best_submission_score(
                session.student_id, session.round_id, question.problem_id
            )
            score += q_score
            results.append(
                QuestionResultPublic(
                    problem_id=question.problem_id,
                    title=problem.title if problem else "Unknown problem",
                    difficulty=question.difficulty,
                    marks=marks,
                    attempted=verdict is not None,
                    verdict=verdict,
                    score=q_score,
                    passed_tests=passed,
                    total_tests=total,
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
        """The leaderboard reveals *other* students' standing, so it always
        waits for the round's window to fully close - showScoreImmediately
        only ever applies to a student's own result."""
        return datetime.now(timezone.utc) >= round_.end_time

    async def _rank_finished_sessions(
        self, round_id: str, sessions: list[RoundSession]
    ) -> list[tuple[RoundSession, int, int]]:
        """Ranks finished sessions by score desc, then completion time asc
        (faster finish wins ties). Returns (session, score, total_marks)
        tuples in ranked order - rank is simply the 1-based position."""
        problems = await self._load_problems(
            [q.problem_id for s in sessions for q in s.assigned_questions]
        )
        scored = []
        for session in sessions:
            score, total_marks, _ = await self._score_session(session, problems)
            scored.append((session, score, total_marks))

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
            score, total_marks, _ = await self._score_session(session)

            rank = None
            total_participants = None
            if available:
                all_finished = [
                    s
                    for s in await self.session_repository.find_many({"roundId": round_.id}, limit=10000)
                    if s.status in _FINISHED_STATUSES
                ]
                ranked = await self._rank_finished_sessions(round_.id, all_finished)
                total_participants = len(ranked)
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
        score, total_marks, questions = await self._score_session(session)

        rank = None
        total_participants = None
        if available:
            all_finished = [
                s
                for s in await self.session_repository.find_many({"roundId": round_id}, limit=10000)
                if s.status in _FINISHED_STATUSES
            ]
            ranked = await self._rank_finished_sessions(round_id, all_finished)
            total_participants = len(ranked)
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
            return LeaderboardResponse(results_available=False, entries=[])

        return await self._build_leaderboard(round_, highlight_student_id=student_id)

    async def get_round_leaderboard_admin(self, round_id: str) -> LeaderboardResponse:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")
        return await self._build_leaderboard(round_, highlight_student_id=None)

    async def _build_leaderboard(
        self, round_: CodingRound, highlight_student_id: str | None
    ) -> LeaderboardResponse:
        sessions = [
            s
            for s in await self.session_repository.find_many({"roundId": round_.id}, limit=10000)
            if s.status in _FINISHED_STATUSES
        ]
        ranked = await self._rank_finished_sessions(round_.id, sessions)

        entries: list[LeaderboardEntry] = []
        for position, (session, score, total_marks) in enumerate(ranked, start=1):
            student = await self.user_repository.find_by_id(session.student_id)
            entries.append(
                LeaderboardEntry(
                    rank=position,
                    student_id=session.student_id,
                    student_name=student.name if student else "Unknown student",
                    student_register_number=student.register_number if student else "-",
                    score=score,
                    total_marks=total_marks,
                    completed_at=session.completed_at or round_.end_time,
                    is_you=session.student_id == highlight_student_id,
                )
            )
        return LeaderboardResponse(results_available=True, entries=entries)

    # -- admin -------------------------------------------------------------

    async def get_admin_round_results(self, round_id: str) -> list[AdminRoundResultEntry]:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        sessions = await self.session_repository.find_many({"roundId": round_id}, limit=10000)
        finished = [s for s in sessions if s.status in _FINISHED_STATUSES]
        ranked = await self._rank_finished_sessions(round_id, finished)
        rank_by_session_id = {session.id: position for position, (session, _, _) in enumerate(ranked, start=1)}

        entries: list[AdminRoundResultEntry] = []
        for session in sessions:
            student = await self.user_repository.find_by_id(session.student_id)
            score, total_marks, _ = await self._score_session(session)
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
