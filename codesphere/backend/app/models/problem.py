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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")


class TestCase(MongoBaseModel):
    problem_id: str = Field(alias="problemId")
    input: str
    expected_output: str = Field(alias="expectedOutput")
    visibility: TestCaseVisibility
