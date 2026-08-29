from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decode_access_token
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
    TopicProgressRepository,
    UserRepository,
)
from app.models.common import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


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


def get_topic_progress_repository() -> TopicProgressRepository:
    return TopicProgressRepository(get_db())


_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    user_repository: UserRepository = Depends(get_user_repository),
) -> User:
    if credentials is None:
        raise _UNAUTHORIZED

    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise _UNAUTHORIZED from exc

    user_id = payload.get("sub")
    if not user_id:
        raise _UNAUTHORIZED

    user = await user_repository.find_by_id(user_id)
    if user is None:
        raise _UNAUTHORIZED

    return user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
