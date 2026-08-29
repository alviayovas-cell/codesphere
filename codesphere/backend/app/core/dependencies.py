from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.database.repositories import (
    ActivityEventRepository,
    AutosaveRepository,
    CodingRoundRepository,
    LearningModuleRepository,
    LearningTopicRepository,
    ProblemRepository,
    RoundSessionRepository,
    SubmissionRepository,
    TestCaseRepository,
    UserRepository,
)


def get_db() -> AsyncIOMotorDatabase:
    return get_database()


def get_user_repository() -> UserRepository:
    return UserRepository(get_db())


def get_learning_module_repository() -> LearningModuleRepository:
    return LearningModuleRepository(get_db())


def get_learning_topic_repository() -> LearningTopicRepository:
    return LearningTopicRepository(get_db())


def get_problem_repository() -> ProblemRepository:
    return ProblemRepository(get_db())


def get_test_case_repository() -> TestCaseRepository:
    return TestCaseRepository(get_db())


def get_coding_round_repository() -> CodingRoundRepository:
    return CodingRoundRepository(get_db())


def get_round_session_repository() -> RoundSessionRepository:
    return RoundSessionRepository(get_db())


def get_submission_repository() -> SubmissionRepository:
    return SubmissionRepository(get_db())


def get_autosave_repository() -> AutosaveRepository:
    return AutosaveRepository(get_db())


def get_activity_event_repository() -> ActivityEventRepository:
    return ActivityEventRepository(get_db())
