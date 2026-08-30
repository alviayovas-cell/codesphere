from datetime import datetime, timedelta, timezone

from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.learning_repository import LearningModuleRepository, LearningTopicRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.progress_repository import TopicProgressRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.common import Difficulty, RoundStatus, UserRole, Verdict
from app.schemas.analytics import (
    AnalyticsOverview,
    DifficultyPerformance,
    ModuleEngagement,
    OverviewStats,
    ProblemPerformance,
    SubmissionTrendPoint,
    TopicPerformance,
)

_TREND_DAYS = 14
_DIFFICULTY_ORDER = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]


class AnalyticsService:
    """Read-only aggregation over existing collections - no new persisted
    state. Every number here is derived fresh on each request, which is
    fine at club scale (tens of students, hundreds of submissions) and
    keeps this phase from having to invent a caching/materialized-view
    layer for numbers nobody needs sub-second."""

    def __init__(
        self,
        user_repository: UserRepository,
        problem_repository: ProblemRepository,
        submission_repository: SubmissionRepository,
        round_repository: CodingRoundRepository,
        module_repository: LearningModuleRepository,
        topic_repository: LearningTopicRepository,
        progress_repository: TopicProgressRepository,
    ):
        self.user_repository = user_repository
        self.problem_repository = problem_repository
        self.submission_repository = submission_repository
        self.round_repository = round_repository
        self.module_repository = module_repository
        self.topic_repository = topic_repository
        self.progress_repository = progress_repository

    async def get_analytics(self) -> AnalyticsOverview:
        students = await self.user_repository.find_many({"role": UserRole.STUDENT.value}, limit=10000)
        problems = await self.problem_repository.find_many(limit=10000)
        # Submission docs only ever come from submit_code_job (Run Code
        # never writes one) - every row here is a real graded attempt.
        submissions = await self.submission_repository.find_many(limit=200000)
        rounds = await self.round_repository.find_many(limit=10000)

        problem_by_id = {p.id: p for p in problems}
        now = datetime.now(timezone.utc)

        overview = self._overview(students, problems, submissions, rounds, problem_by_id, now)
        trend = self._submission_trend(submissions)
        difficulty_breakdown = self._difficulty_breakdown(submissions, problem_by_id)
        topic_breakdown = self._topic_breakdown(submissions, problem_by_id)
        problem_performance = self._problem_performance(submissions, problem_by_id)
        learning_engagement = await self._learning_engagement(students)

        return AnalyticsOverview(
            overview=overview,
            submission_trend=trend,
            difficulty_breakdown=difficulty_breakdown,
            topic_breakdown=topic_breakdown,
            problem_performance=problem_performance,
            learning_engagement=learning_engagement,
        )

    def _overview(self, students, problems, submissions, rounds, problem_by_id, now) -> OverviewStats:
        attempted_ids = {s.problem_id for s in submissions if s.problem_id in problem_by_id}
        accepted = sum(1 for s in submissions if s.verdict == Verdict.ACCEPTED)
        total = len(submissions)
        active_rounds = sum(
            1 for r in rounds if r.status == RoundStatus.SCHEDULED and r.start_time <= now <= r.end_time
        )
        return OverviewStats(
            total_students=len(students),
            total_problems=len(problems),
            problems_attempted=len(attempted_ids),
            total_submissions=total,
            accepted_submissions=accepted,
            overall_pass_rate=round(100 * accepted / total, 1) if total else 0.0,
            active_rounds=active_rounds,
            total_rounds=len(rounds),
        )

    def _submission_trend(self, submissions) -> list[SubmissionTrendPoint]:
        today = datetime.now(timezone.utc).date()
        days = [today - timedelta(days=i) for i in range(_TREND_DAYS - 1, -1, -1)]
        buckets = {d: {"accepted": 0, "other": 0} for d in days}
        for s in submissions:
            day = s.submitted_at.date()
            bucket = buckets.get(day)
            if bucket is None:
                continue
            bucket["accepted" if s.verdict == Verdict.ACCEPTED else "other"] += 1
        return [
            SubmissionTrendPoint(date=d.isoformat(), accepted=buckets[d]["accepted"], other=buckets[d]["other"])
            for d in days
        ]

    def _problem_performance(self, submissions, problem_by_id) -> list[ProblemPerformance]:
        stats: dict[str, dict] = {}
        for s in submissions:
            problem = problem_by_id.get(s.problem_id)
            if problem is None:
                continue
            entry = stats.setdefault(problem.id, {"attempts": 0, "accepted": 0, "score_sum": 0})
            entry["attempts"] += 1
            entry["score_sum"] += s.score
            if s.verdict == Verdict.ACCEPTED:
                entry["accepted"] += 1

        performance = [
            ProblemPerformance(
                problem_id=pid,
                title=problem_by_id[pid].title,
                difficulty=problem_by_id[pid].difficulty,
                topic=problem_by_id[pid].topic,
                attempts=e["attempts"],
                accepted=e["accepted"],
                pass_rate=round(100 * e["accepted"] / e["attempts"], 1),
                avg_score=round(e["score_sum"] / e["attempts"], 1),
            )
            for pid, e in stats.items()
        ]
        # Most-struggled-with first - the signal an admin actually wants
        # from "which problems need a second look".
        performance.sort(key=lambda p: (p.pass_rate, -p.attempts))
        return performance

    def _difficulty_breakdown(self, submissions, problem_by_id) -> list[DifficultyPerformance]:
        stats = {d: {"attempts": 0, "accepted": 0} for d in _DIFFICULTY_ORDER}
        for s in submissions:
            problem = problem_by_id.get(s.problem_id)
            if problem is None:
                continue
            entry = stats[problem.difficulty]
            entry["attempts"] += 1
            if s.verdict == Verdict.ACCEPTED:
                entry["accepted"] += 1

        return [
            DifficultyPerformance(
                difficulty=d,
                attempts=stats[d]["attempts"],
                accepted=stats[d]["accepted"],
                pass_rate=round(100 * stats[d]["accepted"] / stats[d]["attempts"], 1) if stats[d]["attempts"] else 0.0,
            )
            for d in _DIFFICULTY_ORDER
        ]

    def _topic_breakdown(self, submissions, problem_by_id) -> list[TopicPerformance]:
        stats: dict[str, dict] = {}
        for s in submissions:
            problem = problem_by_id.get(s.problem_id)
            if problem is None:
                continue
            entry = stats.setdefault(problem.topic, {"attempts": 0, "accepted": 0})
            entry["attempts"] += 1
            if s.verdict == Verdict.ACCEPTED:
                entry["accepted"] += 1

        breakdown = [
            TopicPerformance(
                topic=topic,
                attempts=e["attempts"],
                accepted=e["accepted"],
                pass_rate=round(100 * e["accepted"] / e["attempts"], 1),
            )
            for topic, e in stats.items()
        ]
        # Weakest topics first (a lightweight, aggregate stand-in for the
        # spec's "advanced weak-topic detection" future enhancement - this
        # is platform-wide, not a per-student diagnostic).
        breakdown.sort(key=lambda t: (t.pass_rate, -t.attempts))
        return breakdown

    async def _learning_engagement(self, students) -> list[ModuleEngagement]:
        modules = await self.module_repository.find_many(limit=1000)
        topics = await self.topic_repository.find_many(limit=10000)
        progress = await self.progress_repository.find_many(limit=1000000)

        topics_by_module: dict[str, list] = {}
        for topic in topics:
            topics_by_module.setdefault(topic.module_id, []).append(topic)
        completed_pairs = {(p.student_id, p.topic_id) for p in progress}

        engagement: list[ModuleEngagement] = []
        for module in modules:
            module_topics = topics_by_module.get(module.id, [])
            total_topics = len(module_topics)
            if total_topics == 0 or not students:
                engagement.append(
                    ModuleEngagement(
                        module_id=module.id, title=module.title, total_topics=total_topics,
                        students_started=0, avg_completion_percent=0.0,
                    )
                )
                continue

            started = 0
            completion_fractions = []
            for student in students:
                completed_count = sum(1 for t in module_topics if (student.id, t.id) in completed_pairs)
                if completed_count > 0:
                    started += 1
                completion_fractions.append(completed_count / total_topics)

            engagement.append(
                ModuleEngagement(
                    module_id=module.id,
                    title=module.title,
                    total_topics=total_topics,
                    students_started=started,
                    avg_completion_percent=round(100 * sum(completion_fractions) / len(completion_fractions), 1),
                )
            )

        # Least-engaged modules first - the ones that might need promotion
        # or a closer look at why students aren't finishing them.
        engagement.sort(key=lambda m: m.avg_completion_percent)
        return engagement
