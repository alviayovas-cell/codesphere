from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import Difficulty, SessionStatus, Verdict


class QuestionResultPublic(BaseModel):
    """One assigned question's best-attempt outcome within a round."""

    problem_id: str = Field(serialization_alias="problemId")
    title: str
    difficulty: Difficulty
    marks: int
    attempted: bool
    verdict: Verdict | None = None
    score: float
    passed_tests: int = Field(serialization_alias="passedTests")
    total_tests: int = Field(serialization_alias="totalTests")

    model_config = {"populate_by_name": True}


class RoundResultSummary(BaseModel):
    """One row of a student's own results list - one per round they've
    completed (submitted/expired/locked). `resultsAvailable` gates whether
    `score`/`rank`/`totalParticipants` are populated yet."""

    round_id: str = Field(serialization_alias="roundId")
    round_title: str = Field(serialization_alias="roundTitle")
    status: SessionStatus
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    total_marks: int = Field(serialization_alias="totalMarks")
    results_available: bool = Field(serialization_alias="resultsAvailable")
    score: float | None = None
    rank: int | None = None
    total_participants: int | None = Field(default=None, serialization_alias="totalParticipants")

    model_config = {"populate_by_name": True}


class RoundResultDetail(BaseModel):
    round_id: str = Field(serialization_alias="roundId")
    round_title: str = Field(serialization_alias="roundTitle")
    status: SessionStatus
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    total_marks: int = Field(serialization_alias="totalMarks")
    results_available: bool = Field(serialization_alias="resultsAvailable")
    score: float | None = None
    rank: int | None = None
    total_participants: int | None = Field(default=None, serialization_alias="totalParticipants")
    questions: list[QuestionResultPublic] | None = None

    model_config = {"populate_by_name": True}


class LeaderboardEntry(BaseModel):
    rank: int
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    student_register_number: str = Field(serialization_alias="studentRegisterNumber")
    score: float
    total_marks: int = Field(serialization_alias="totalMarks")
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    is_you: bool = Field(default=False, serialization_alias="isYou")

    model_config = {"populate_by_name": True}


class LeaderboardResponse(BaseModel):
    results_available: bool = Field(serialization_alias="resultsAvailable")
    entries: list[LeaderboardEntry]
    # Always true - the leaderboard is always visible immediately, there's
    # no gated/hidden mode. Kept as a field (rather than removed) so the
    # frontend's existing live-polling logic needs no changes.
    is_live: bool = Field(default=True, serialization_alias="isLive")

    model_config = {"populate_by_name": True}


class AdminRoundResultEntry(BaseModel):
    """Ungated admin view of every session in a round, finished or not."""

    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    student_register_number: str = Field(serialization_alias="studentRegisterNumber")
    status: SessionStatus
    score: float
    total_marks: int = Field(serialization_alias="totalMarks")
    rank: int | None = None
    violation_count: int = Field(serialization_alias="violationCount")
    completed_at: datetime | None = Field(serialization_alias="completedAt")

    model_config = {"populate_by_name": True}
