from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.models.common import Difficulty, MongoBaseModel, TestCaseVisibility


class ProblemExample(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class Problem(MongoBaseModel):
    title: str
    slug: str
    description: str
    input_format: str = Field(alias="inputFormat")
    output_format: str = Field(alias="outputFormat")
    constraints: str
    examples: list[ProblemExample] = Field(default_factory=list)
    difficulty: Difficulty
    topic: str
    language: str = "C"
    marks: int
    # When true, this problem is excluded from the general student-facing
    # problem bank (GET /api/problems, /api/problems/{id}) - only reachable
    # through a coding round's assigned questions once a student has
    # actually started that round. Defaults false so every problem stays
    # practice-visible unless an admin explicitly reserves it for an
    # assessment (spec: round question pools should stay hidden until
    # start, which the shared practice bank would otherwise undermine for
    # any problem also used in an upcoming/active round).
    is_assessment_only: bool = Field(default=False, alias="isAssessmentOnly")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")


class TestCase(MongoBaseModel):
    problem_id: str = Field(alias="problemId")
    input: str
    expected_output: str = Field(alias="expectedOutput")
    visibility: TestCaseVisibility
