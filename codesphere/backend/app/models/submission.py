from datetime import datetime, timezone

from pydantic import Field

from app.models.common import MongoBaseModel, SubmissionType, Verdict


class Submission(MongoBaseModel):
    student_id: str = Field(alias="studentId")
    round_id: str | None = Field(default=None, alias="roundId")
    problem_id: str = Field(alias="problemId")
    code: str
    language: str = "C"
    submission_type: SubmissionType = Field(alias="submissionType")
    verdict: Verdict = Verdict.PENDING
    score: int = 0
    passed_tests: int = Field(default=0, alias="passedTests")
    total_tests: int = Field(default=0, alias="totalTests")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="submittedAt")
