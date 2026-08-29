from pydantic import BaseModel, Field

from app.models.common import Difficulty, TestCaseVisibility
from app.models.problem import ProblemExample


class TestCaseCreate(BaseModel):
    input: str
    expected_output: str = Field(serialization_alias="expectedOutput", validation_alias="expectedOutput")
    visibility: TestCaseVisibility

    model_config = {"populate_by_name": True}


class TestCaseUpdate(BaseModel):
    input: str | None = None
    expected_output: str | None = Field(
        default=None, serialization_alias="expectedOutput", validation_alias="expectedOutput"
    )
    visibility: TestCaseVisibility | None = None

    model_config = {"populate_by_name": True}


class TestCasePublic(BaseModel):
    """A test case as shown to students: input/expected output only, no
    id/visibility metadata, and only ever built from PUBLIC test cases."""

    input: str
    expected_output: str = Field(serialization_alias="expectedOutput")

    model_config = {"populate_by_name": True}


class TestCaseAdminView(BaseModel):
    id: str
    problem_id: str = Field(serialization_alias="problemId")
    input: str
    expected_output: str = Field(serialization_alias="expectedOutput")
    visibility: TestCaseVisibility

    model_config = {"populate_by_name": True}


class ProblemExampleInput(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class ProblemCreate(BaseModel):
    title: str
    slug: str | None = None
    description: str
    input_format: str = Field(serialization_alias="inputFormat", validation_alias="inputFormat")
    output_format: str = Field(serialization_alias="outputFormat", validation_alias="outputFormat")
    constraints: str
    examples: list[ProblemExampleInput] = Field(default_factory=list)
    difficulty: Difficulty
    topic: str
    language: str = "C"
    marks: int

    model_config = {"populate_by_name": True}


class ProblemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    input_format: str | None = Field(
        default=None, serialization_alias="inputFormat", validation_alias="inputFormat"
    )
    output_format: str | None = Field(
        default=None, serialization_alias="outputFormat", validation_alias="outputFormat"
    )
    constraints: str | None = None
    examples: list[ProblemExampleInput] | None = None
    difficulty: Difficulty | None = None
    topic: str | None = None
    language: str | None = None
    marks: int | None = None

    model_config = {"populate_by_name": True}


class ProblemSummary(BaseModel):
    id: str
    title: str
    slug: str
    difficulty: Difficulty
    topic: str
    language: str
    marks: int

    model_config = {"populate_by_name": True}


class ProblemPublic(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    input_format: str = Field(serialization_alias="inputFormat")
    output_format: str = Field(serialization_alias="outputFormat")
    constraints: str
    examples: list[ProblemExample]
    difficulty: Difficulty
    topic: str
    language: str
    marks: int
    public_test_cases: list[TestCasePublic] = Field(
        default_factory=list, serialization_alias="publicTestCases"
    )

    model_config = {"populate_by_name": True}


class ProblemAdminView(ProblemPublic):
    test_cases: list[TestCaseAdminView] = Field(default_factory=list, serialization_alias="testCases")
