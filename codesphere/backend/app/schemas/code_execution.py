from pydantic import BaseModel, Field

from app.models.common import Verdict


class RunCodeRequest(BaseModel):
    problem_id: str = Field(validation_alias="problemId")
    code: str
    stdin: str = ""

    model_config = {"populate_by_name": True}


class RunCodeResult(BaseModel):
    verdict: Verdict
    stdout: str
    stderr: str
    compile_output: str = Field(serialization_alias="compileOutput")
    status_description: str = Field(serialization_alias="statusDescription")
    time_seconds: float | None = Field(default=None, serialization_alias="timeSeconds")
    memory_kb: int | None = Field(default=None, serialization_alias="memoryKb")

    model_config = {"populate_by_name": True}


class SubmitCodeRequest(BaseModel):
    problem_id: str = Field(validation_alias="problemId")
    code: str

    model_config = {"populate_by_name": True}


class TestCaseResult(BaseModel):
    index: int
    verdict: Verdict


class SubmitCodeResult(BaseModel):
    submission_id: str = Field(serialization_alias="submissionId")
    verdict: Verdict
    score: int
    passed_tests: int = Field(serialization_alias="passedTests")
    total_tests: int = Field(serialization_alias="totalTests")
    test_case_results: list[TestCaseResult] = Field(serialization_alias="testCaseResults")
    compile_output: str = Field(default="", serialization_alias="compileOutput")

    model_config = {"populate_by_name": True}
