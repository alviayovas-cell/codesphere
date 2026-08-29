from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import Difficulty, RoundStatus, SessionStatus


class AssessmentConfigurationInput(BaseModel):
    grace_period_seconds: int = Field(default=10, serialization_alias="gracePeriodSeconds", validation_alias="gracePeriodSeconds")
    max_violations: int = Field(default=2, serialization_alias="maxViolations", validation_alias="maxViolations")
    auto_submit_enabled: bool = Field(default=True, serialization_alias="autoSubmitEnabled", validation_alias="autoSubmitEnabled")

    model_config = {"populate_by_name": True}


class QuestionPoolConfigurationInput(BaseModel):
    easy_questions: int = Field(default=0, serialization_alias="easyQuestions", validation_alias="easyQuestions")
    medium_questions: int = Field(
        default=0, serialization_alias="mediumQuestions", validation_alias="mediumQuestions"
    )
    hard_questions: int = Field(default=0, serialization_alias="hardQuestions", validation_alias="hardQuestions")
    randomize_order: bool = Field(
        default=True, serialization_alias="randomizeOrder", validation_alias="randomizeOrder"
    )

    model_config = {"populate_by_name": True}


class ResultConfigurationInput(BaseModel):
    show_results_during_round: bool = Field(
        default=False, serialization_alias="showResultsDuringRound", validation_alias="showResultsDuringRound"
    )
    show_test_case_count: bool = Field(
        default=False, serialization_alias="showTestCaseCount", validation_alias="showTestCaseCount"
    )
    show_score_immediately: bool = Field(
        default=False, serialization_alias="showScoreImmediately", validation_alias="showScoreImmediately"
    )

    model_config = {"populate_by_name": True}


class CodingRoundCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int = Field(serialization_alias="durationMinutes", validation_alias="durationMinutes")
    start_time: datetime = Field(serialization_alias="startTime", validation_alias="startTime")
    end_time: datetime = Field(serialization_alias="endTime", validation_alias="endTime")
    problem_ids: list[str] = Field(serialization_alias="problemIds", validation_alias="problemIds")
    question_pool_configuration: QuestionPoolConfigurationInput = Field(
        default_factory=QuestionPoolConfigurationInput,
        serialization_alias="questionPoolConfiguration",
        validation_alias="questionPoolConfiguration",
    )
    assessment_configuration: AssessmentConfigurationInput = Field(
        default_factory=AssessmentConfigurationInput,
        serialization_alias="assessmentConfiguration",
        validation_alias="assessmentConfiguration",
    )
    result_configuration: ResultConfigurationInput = Field(
        default_factory=ResultConfigurationInput,
        serialization_alias="resultConfiguration",
        validation_alias="resultConfiguration",
    )

    model_config = {"populate_by_name": True}


class CodingRoundUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    duration_minutes: int | None = Field(default=None, serialization_alias="durationMinutes", validation_alias="durationMinutes")
    start_time: datetime | None = Field(default=None, serialization_alias="startTime", validation_alias="startTime")
    end_time: datetime | None = Field(default=None, serialization_alias="endTime", validation_alias="endTime")
    problem_ids: list[str] | None = Field(default=None, serialization_alias="problemIds", validation_alias="problemIds")
    status: RoundStatus | None = None
    question_pool_configuration: QuestionPoolConfigurationInput | None = Field(
        default=None, serialization_alias="questionPoolConfiguration", validation_alias="questionPoolConfiguration"
    )
    assessment_configuration: AssessmentConfigurationInput | None = Field(
        default=None, serialization_alias="assessmentConfiguration", validation_alias="assessmentConfiguration"
    )
    result_configuration: ResultConfigurationInput | None = Field(
        default=None, serialization_alias="resultConfiguration", validation_alias="resultConfiguration"
    )

    model_config = {"populate_by_name": True}


class CodingRoundSummary(BaseModel):
    """Student-facing round listing - deliberately excludes problemIds so
    the question pool isn't visible before a student starts the round."""

    id: str
    title: str
    description: str
    duration_minutes: int = Field(serialization_alias="durationMinutes")
    start_time: datetime = Field(serialization_alias="startTime")
    end_time: datetime = Field(serialization_alias="endTime")
    question_count: int = Field(serialization_alias="questionCount")
    total_marks: int = Field(serialization_alias="totalMarks")
    has_started_window: bool = Field(serialization_alias="hasStartedWindow")
    has_ended: bool = Field(serialization_alias="hasEnded")
    student_status: SessionStatus | None = Field(default=None, serialization_alias="studentStatus")

    model_config = {"populate_by_name": True}


class CodingRoundAdminView(BaseModel):
    id: str
    title: str
    description: str
    duration_minutes: int = Field(serialization_alias="durationMinutes")
    start_time: datetime = Field(serialization_alias="startTime")
    end_time: datetime = Field(serialization_alias="endTime")
    status: RoundStatus
    problem_ids: list[str] = Field(serialization_alias="problemIds")
    question_pool_configuration: QuestionPoolConfigurationInput = Field(serialization_alias="questionPoolConfiguration")
    assessment_configuration: AssessmentConfigurationInput = Field(serialization_alias="assessmentConfiguration")
    result_configuration: ResultConfigurationInput = Field(serialization_alias="resultConfiguration")

    model_config = {"populate_by_name": True}


class AssignedQuestionPublic(BaseModel):
    problem_id: str = Field(serialization_alias="problemId")
    difficulty: Difficulty
    order: int

    model_config = {"populate_by_name": True}


class RoundSessionPublic(BaseModel):
    id: str
    round_id: str = Field(serialization_alias="roundId")
    status: SessionStatus
    started_at: datetime = Field(serialization_alias="startedAt")
    expires_at: datetime = Field(serialization_alias="expiresAt")
    remaining_seconds: int = Field(serialization_alias="remainingSeconds")
    assigned_questions: list[AssignedQuestionPublic] = Field(serialization_alias="assignedQuestions")
    violation_count: int = Field(serialization_alias="violationCount")
    max_violations: int = Field(serialization_alias="maxViolations")

    model_config = {"populate_by_name": True}
