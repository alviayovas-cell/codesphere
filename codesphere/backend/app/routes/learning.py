from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import (
    get_current_user,
    get_learning_module_repository,
    get_learning_topic_repository,
    get_topic_progress_repository,
)
from app.database.repositories.learning_repository import (
    LearningModuleRepository,
    LearningTopicRepository,
)
from app.database.repositories.progress_repository import TopicProgressRepository
from app.models.user import User
from app.schemas.learning import LearningModulePublic, LearningTopicPublic, ProgressSummary
from app.services.learning_service import LearningService, TopicNotFoundError

router = APIRouter(prefix="/learning", tags=["learning"])


def _service(
    module_repository: LearningModuleRepository = Depends(get_learning_module_repository),
    topic_repository: LearningTopicRepository = Depends(get_learning_topic_repository),
    progress_repository: TopicProgressRepository = Depends(get_topic_progress_repository),
) -> LearningService:
    return LearningService(module_repository, topic_repository, progress_repository)


@router.get("/modules", response_model=list[LearningModulePublic])
async def list_modules(
    current_user: User = Depends(get_current_user),
    service: LearningService = Depends(_service),
) -> list[LearningModulePublic]:
    return await service.list_modules_with_topics(current_user.id)


@router.get("/topics/{topic_id}", response_model=LearningTopicPublic)
async def get_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    service: LearningService = Depends(_service),
) -> LearningTopicPublic:
    try:
        return await service.get_topic(topic_id, current_user.id)
    except TopicNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/topics/{topic_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
async def mark_topic_complete(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    service: LearningService = Depends(_service),
) -> None:
    try:
        await service.mark_topic_complete(current_user.id, topic_id)
    except TopicNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/topics/{topic_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
async def unmark_topic_complete(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    service: LearningService = Depends(_service),
) -> None:
    await service.unmark_topic_complete(current_user.id, topic_id)


@router.get("/progress", response_model=ProgressSummary)
async def get_progress(
    current_user: User = Depends(get_current_user),
    service: LearningService = Depends(_service),
) -> ProgressSummary:
    return await service.get_progress_summary(current_user.id)
