"""Similarity-based plagiarism flagging for coding-round submissions.

Deliberately simple, not a MOSS/Winnowing-grade system: normalizes each
submission's source (strips comments and collapses whitespace, per
language) and scores every same-language pair per problem with
difflib.SequenceMatcher's ratio. This catches the common contest case -
copy-paste with cosmetic edits (reformatting, added comments, renamed-only-
a-little) - cheaply and with zero new dependencies. It will NOT catch
systematic identifier renaming or logic reordering; a token-fingerprinting
approach (Winnowing) would, at real implementation cost. Flagged pairs are
a lead for a human to review, never an automatic verdict.
"""

import re
from difflib import SequenceMatcher

from app.core.languages import SupportedLanguage
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.problem_repository import ProblemRepository
from app.database.repositories.submission_repository import SubmissionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.common import SubmissionType
from app.models.submission import Submission
from app.schemas.plagiarism import PlagiarismPair, ProblemPlagiarismGroup
from app.services.coding_round_service import RoundNotFoundError

_GRADED_SUBMISSION_TYPES = [SubmissionType.SUBMIT.value, SubmissionType.AUTO_SUBMIT.value]

# Below this, two solutions will look "similar" just because short
# competitive-programming code has limited ways to write it - not a
# meaningful plagiarism signal.
_MIN_CODE_LENGTH = 40
# Tuned to catch copy-paste-with-cosmetic-edits while staying well above
# the incidental similarity two independently-written short solutions to
# the same simple problem will naturally share. Deliberately a constant,
# not admin-configurable yet - see the module docstring for scope.
_SIMILARITY_THRESHOLD = 0.75

_LINE_COMMENT_PATTERNS: dict[SupportedLanguage, re.Pattern] = {
    SupportedLanguage.C: re.compile(r"//.*"),
    SupportedLanguage.CPP: re.compile(r"//.*"),
    SupportedLanguage.JAVA: re.compile(r"//.*"),
    SupportedLanguage.JAVASCRIPT: re.compile(r"//.*"),
    SupportedLanguage.PYTHON3: re.compile(r"#.*"),
}
_BLOCK_COMMENT_PATTERN = re.compile(r"/\*.*?\*/", re.DOTALL)  # C-family only; Python has no equivalent


def normalize_code(code: str, language: SupportedLanguage) -> str:
    """Strips comments and blank lines and collapses per-line whitespace,
    so trivial evasion (reformatting, comment-padding, blank-line padding)
    doesn't lower a similarity score that should otherwise be high. Does
    NOT normalize identifiers - renaming variables/functions still lowers
    the score (a documented scope cut, not an oversight)."""
    text = code
    if language != SupportedLanguage.PYTHON3:
        text = _BLOCK_COMMENT_PATTERN.sub("", text)
    line_comment = _LINE_COMMENT_PATTERNS.get(language)
    lines = []
    for line in text.splitlines():
        if line_comment:
            line = line_comment.sub("", line)
        collapsed = " ".join(line.split())
        if collapsed:
            lines.append(collapsed)
    return "\n".join(lines)


def similarity(code_a: str, code_b: str, language: SupportedLanguage) -> float:
    norm_a = normalize_code(code_a, language)
    norm_b = normalize_code(code_b, language)
    if not norm_a or not norm_b:
        return 0.0
    return SequenceMatcher(None, norm_a, norm_b).ratio()


class PlagiarismService:
    def __init__(
        self,
        round_repository: CodingRoundRepository,
        problem_repository: ProblemRepository,
        submission_repository: SubmissionRepository,
        user_repository: UserRepository,
    ):
        self.round_repository = round_repository
        self.problem_repository = problem_repository
        self.submission_repository = submission_repository
        self.user_repository = user_repository

    async def detect_round_plagiarism(self, round_id: str) -> list[ProblemPlagiarismGroup]:
        round_ = await self.round_repository.find_by_id(round_id)
        if round_ is None:
            raise RoundNotFoundError("Coding round not found")

        submissions = await self.submission_repository.find_many(
            {"roundId": round_id, "submissionType": {"$in": _GRADED_SUBMISSION_TYPES}}, limit=200000
        )

        # Best (highest-scoring, then latest) submission per (student,
        # problem) - each student's "final answer", same reduction
        # results/leaderboard already use for this round.
        best: dict[tuple[str, str], Submission] = {}
        for s in submissions:
            key = (s.student_id, s.problem_id)
            current = best.get(key)
            if current is None or (s.score, s.submitted_at) > (current.score, current.submitted_at):
                best[key] = s

        by_problem: dict[str, list[Submission]] = {}
        for s in best.values():
            if len(s.code.strip()) >= _MIN_CODE_LENGTH:
                by_problem.setdefault(s.problem_id, []).append(s)

        problems_by_id = {p.id: p for p in await self.problem_repository.find_by_ids(list(by_problem.keys()))}
        student_ids = list({s.student_id for subs in by_problem.values() for s in subs})
        students_by_id = {u.id: u for u in await self.user_repository.find_by_ids(student_ids)}

        groups: list[ProblemPlagiarismGroup] = []
        for problem_id, subs in by_problem.items():
            pairs: list[PlagiarismPair] = []
            for i in range(len(subs)):
                for j in range(i + 1, len(subs)):
                    a, b = subs[i], subs[j]
                    # Cross-language text similarity is meaningless here.
                    if a.language != b.language:
                        continue
                    score = similarity(a.code, b.code, a.language)
                    if score < _SIMILARITY_THRESHOLD:
                        continue
                    student_a = students_by_id.get(a.student_id)
                    student_b = students_by_id.get(b.student_id)
                    pairs.append(
                        PlagiarismPair(
                            submission_a_id=a.id,
                            student_a_id=a.student_id,
                            student_a_name=student_a.name if student_a else "Unknown student",
                            submission_b_id=b.id,
                            student_b_id=b.student_id,
                            student_b_name=student_b.name if student_b else "Unknown student",
                            similarity=round(score, 3),
                            language=a.language,
                        )
                    )
            if not pairs:
                continue
            pairs.sort(key=lambda p: p.similarity, reverse=True)
            problem = problems_by_id.get(problem_id)
            groups.append(
                ProblemPlagiarismGroup(
                    problem_id=problem_id,
                    problem_title=problem.title if problem else "Unknown problem",
                    pairs=pairs,
                )
            )

        groups.sort(key=lambda g: g.pairs[0].similarity, reverse=True)
        return groups
