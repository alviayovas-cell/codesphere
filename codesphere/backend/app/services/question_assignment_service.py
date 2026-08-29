"""Smart Question Randomization (spec section 14).

Given a round's problem pool and a QuestionPoolConfiguration
(easy/medium/hard counts + randomizeOrder), assigns each student a
balanced combination - the same difficulty mix for everyone - while
maximizing diversity of *which* problems within each difficulty bucket
different students get, by always preferring the currently
least-used problem in that bucket (a simple, effective greedy
round-robin: over many students it spreads usage evenly across the
pool, and degrades gracefully to "everyone gets the same one" when a
bucket only has one candidate).

Assignment happens exactly once per (round, student) - the caller
(CodingRoundService.start_round) only invokes this the first time a
session is created; after that, the persisted RoundSession is the
source of truth, so refreshing the page or restarting never changes
what was assigned.
"""

import random
from collections import Counter

from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.models.coding_round import AssignedQuestion, CodingRound, QuestionPoolConfiguration
from app.models.common import Difficulty

_DIFFICULTY_ORDER = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]


def uses_smart_assignment(config: QuestionPoolConfiguration) -> bool:
    return config.easy_questions + config.medium_questions + config.hard_questions > 0


def _requested_counts(config: QuestionPoolConfiguration) -> list[tuple[Difficulty, int]]:
    return [
        (Difficulty.EASY, config.easy_questions),
        (Difficulty.MEDIUM, config.medium_questions),
        (Difficulty.HARD, config.hard_questions),
    ]


class QuestionAssignmentService:
    def __init__(self, problem_repository: ProblemRepository, session_repository: RoundSessionRepository):
        self.problem_repository = problem_repository
        self.session_repository = session_repository

    async def group_pool_by_difficulty(self, problem_ids: list[str]) -> dict[Difficulty, list[str]]:
        buckets: dict[Difficulty, list[str]] = {d: [] for d in _DIFFICULTY_ORDER}
        for problem_id in problem_ids:
            problem = await self.problem_repository.find_by_id(problem_id)
            if problem is not None:
                buckets[problem.difficulty].append(problem_id)
        return buckets

    async def validate_pool_can_satisfy(
        self, problem_ids: list[str], config: QuestionPoolConfiguration
    ) -> list[str]:
        """Returns human-readable error messages (empty list if the pool has
        enough problems of each requested difficulty)."""
        if not uses_smart_assignment(config):
            return []

        buckets = await self.group_pool_by_difficulty(problem_ids)
        errors = []
        for difficulty, count in _requested_counts(config):
            available = len(buckets[difficulty])
            if count > available:
                errors.append(
                    f"Question pool has only {available} {difficulty.value} problem(s), "
                    f"but {count} are required by the question pool configuration"
                )
        return errors

    async def assign_questions(self, round_: CodingRound) -> list[AssignedQuestion]:
        config = round_.question_pool_configuration

        if not uses_smart_assignment(config):
            # No pool configuration set: fall back to assigning the whole
            # pool, in listed order (the original, simpler Phase 8 behavior
            # - still used by rounds that don't opt into balancing).
            return [
                AssignedQuestion(
                    problem_id=problem_id,
                    difficulty=(await self.problem_repository.find_by_id(problem_id)).difficulty,
                    order=index + 1,
                )
                for index, problem_id in enumerate(round_.problem_ids)
            ]

        buckets = await self.group_pool_by_difficulty(round_.problem_ids)
        usage_counts = await self._usage_counts(round_.id)

        selected: list[tuple[str, Difficulty]] = []
        for difficulty, count in _requested_counts(config):
            if count <= 0:
                continue
            candidates = list(buckets[difficulty])
            random.shuffle(candidates)  # tie-break randomly within equal usage counts
            candidates.sort(key=lambda pid: usage_counts.get(pid, 0))
            selected.extend((problem_id, difficulty) for problem_id in candidates[:count])

        if config.randomize_order:
            random.shuffle(selected)

        return [
            AssignedQuestion(problem_id=problem_id, difficulty=difficulty, order=index + 1)
            for index, (problem_id, difficulty) in enumerate(selected)
        ]

    async def _usage_counts(self, round_id: str) -> dict[str, int]:
        sessions = await self.session_repository.find_many({"roundId": round_id}, limit=10000)
        counts: Counter[str] = Counter()
        for session in sessions:
            for question in session.assigned_questions:
                counts[question.problem_id] += 1
        return counts
