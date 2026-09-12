from pydantic import BaseModel, Field

from app.core.languages import SupportedLanguage


class PlagiarismPair(BaseModel):
    """Two students' best submissions to the same problem, flagged because
    their normalized source code is similar enough to warrant a manual
    look - not proof of copying by itself."""

    submission_a_id: str = Field(serialization_alias="submissionAId")
    student_a_id: str = Field(serialization_alias="studentAId")
    student_a_name: str = Field(serialization_alias="studentAName")
    submission_b_id: str = Field(serialization_alias="submissionBId")
    student_b_id: str = Field(serialization_alias="studentBId")
    student_b_name: str = Field(serialization_alias="studentBName")
    similarity: float
    language: SupportedLanguage

    model_config = {"populate_by_name": True}


class ProblemPlagiarismGroup(BaseModel):
    problem_id: str = Field(serialization_alias="problemId")
    problem_title: str = Field(serialization_alias="problemTitle")
    pairs: list[PlagiarismPair]

    model_config = {"populate_by_name": True}


class SubmissionCodeView(BaseModel):
    """Full source of one submission, for the admin's side-by-side compare
    view - never exposed to students."""

    submission_id: str = Field(serialization_alias="submissionId")
    student_name: str = Field(serialization_alias="studentName")
    language: SupportedLanguage
    code: str
    score: float
    verdict: str

    model_config = {"populate_by_name": True}
