from datetime import datetime, timezone
from typing import Any

from pydantic import Field, field_validator

from app.core.languages import DEFAULT_LANGUAGE, SupportedLanguage
from app.models.common import MongoBaseModel, SubmissionType, Verdict


class Submission(MongoBaseModel):
    student_id: str = Field(alias="studentId")
    round_id: str | None = Field(default=None, alias="roundId")
    problem_id: str = Field(alias="problemId")
    code: str
    language: SupportedLanguage = DEFAULT_LANGUAGE

    @field_validator("language", mode="before")
    @classmethod
    def _normalize_legacy_language(cls, v: Any) -> Any:
        """Every submission stored before multi-language support shipped
        has the literal "C" (uppercase) - the old hardcoded value -
        while SupportedLanguage's member is "c" (lowercase). Lowercasing
        here lets every pre-existing Submission document keep loading
        without a data migration."""
        return v.lower() if isinstance(v, str) else v

    submission_type: SubmissionType = Field(alias="submissionType")
    verdict: Verdict = Verdict.PENDING
    # Proportional to tests passed (see submit_code_job), rounded to the
    # nearest 0.5 - not just full marks or zero.
    score: float = 0.0
    passed_tests: int = Field(default=0, alias="passedTests")
    total_tests: int = Field(default=0, alias="totalTests")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="submittedAt")
