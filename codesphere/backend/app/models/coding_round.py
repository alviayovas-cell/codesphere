from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.models.common import Difficulty, MongoBaseModel, RoundStatus


class QuestionPoolConfiguration(BaseModel):
    easy_questions: int = Field(default=0, alias="easyQuestions")
    medium_questions: int = Field(default=0, alias="mediumQuestions")
    hard_questions: int = Field(default=0, alias="hardQuestions")
    randomize_order: bool = Field(default=True, alias="randomizeOrder")

    model_config = {"populate_by_name": True}


class AssessmentConfiguration(BaseModel):
    grace_period_seconds: int = Field(default=10, alias="gracePeriodSeconds")
    max_violations: int = Field(default=2, alias="maxViolations")
    auto_submit_enabled: bool = Field(default=True, alias="autoSubmitEnabled")

    model_config = {"populate_by_name": True}


class ResultConfiguration(BaseModel):
    show_results_during_round: bool = Field(default=False, alias="showResultsDuringRound")
    show_test_case_count: bool = Field(default=False, alias="showTestCaseCount")
    show_score_immediately: bool = Field(default=False, alias="showScoreImmediately")

    model_config = {"populate_by_name": True}


class CodingRound(MongoBaseModel):
    title: str
    description: str
    duration_minutes: int = Field(alias="durationMinutes")
    start_time: datetime = Field(alias="startTime")
    end_time: datetime = Field(alias="endTime")
    status: RoundStatus = RoundStatus.DRAFT
    # The pool of problems eligible for this round. Phase 8 assigns every
    # student the full pool, in this order (naive/deterministic). Phase 9's
    # "Smart Question Randomization" will use question_pool_configuration
    # below to instead assign a balanced, diversified subset per student
    # from this same pool - assigned_questions storage doesn't need to
    # change for that upgrade.
    problem_ids: list[str] = Field(default_factory=list, alias="problemIds")
    question_pool_configuration: QuestionPoolConfiguration = Field(
        default_factory=QuestionPoolConfiguration, alias="questionPoolConfiguration"
    )
    assessment_configuration: AssessmentConfiguration = Field(
        default_factory=AssessmentConfiguration, alias="assessmentConfiguration"
    )
    result_configuration: ResultConfiguration = Field(
        default_factory=ResultConfiguration, alias="resultConfiguration"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")


class AssignedQuestion(BaseModel):
    problem_id: str = Field(alias="problemId")
    difficulty: Difficulty
    order: int

    model_config = {"populate_by_name": True}
