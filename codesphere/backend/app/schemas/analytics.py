from pydantic import BaseModel, Field

from app.models.common import Difficulty


class OverviewStats(BaseModel):
    total_students: int = Field(serialization_alias="totalStudents")
    total_problems: int = Field(serialization_alias="totalProblems")
    problems_attempted: int = Field(serialization_alias="problemsAttempted")
    total_submissions: int = Field(serialization_alias="totalSubmissions")
    accepted_submissions: int = Field(serialization_alias="acceptedSubmissions")
    overall_pass_rate: float = Field(serialization_alias="overallPassRate")
    active_rounds: int = Field(serialization_alias="activeRounds")
    total_rounds: int = Field(serialization_alias="totalRounds")

    model_config = {"populate_by_name": True}


class SubmissionTrendPoint(BaseModel):
    date: str
    accepted: int
    other: int

    model_config = {"populate_by_name": True}


class ProblemPerformance(BaseModel):
    problem_id: str = Field(serialization_alias="problemId")
    title: str
    difficulty: Difficulty
    topic: str
    attempts: int
    accepted: int
    pass_rate: float = Field(serialization_alias="passRate")
    avg_score: float = Field(serialization_alias="avgScore")

    model_config = {"populate_by_name": True}


class DifficultyPerformance(BaseModel):
    difficulty: Difficulty
    attempts: int
    accepted: int
    pass_rate: float = Field(serialization_alias="passRate")

    model_config = {"populate_by_name": True}


class TopicPerformance(BaseModel):
    topic: str
    attempts: int
    accepted: int
    pass_rate: float = Field(serialization_alias="passRate")

    model_config = {"populate_by_name": True}


class ModuleEngagement(BaseModel):
    module_id: str = Field(serialization_alias="moduleId")
    title: str
    total_topics: int = Field(serialization_alias="totalTopics")
    students_started: int = Field(serialization_alias="studentsStarted")
    avg_completion_percent: float = Field(serialization_alias="avgCompletionPercent")

    model_config = {"populate_by_name": True}


class AnalyticsOverview(BaseModel):
    overview: OverviewStats
    submission_trend: list[SubmissionTrendPoint] = Field(serialization_alias="submissionTrend")
    difficulty_breakdown: list[DifficultyPerformance] = Field(serialization_alias="difficultyBreakdown")
    topic_breakdown: list[TopicPerformance] = Field(serialization_alias="topicBreakdown")
    problem_performance: list[ProblemPerformance] = Field(serialization_alias="problemPerformance")
    learning_engagement: list[ModuleEngagement] = Field(serialization_alias="learningEngagement")

    model_config = {"populate_by_name": True}
