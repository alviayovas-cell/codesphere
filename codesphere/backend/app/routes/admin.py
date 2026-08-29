from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import (
    get_current_admin_user,
    get_learning_module_repository,
    get_learning_topic_repository,
    get_topic_progress_repository,
    get_user_repository,
)
from app.database.repositories.learning_repository import (
    LearningModuleRepository,
    LearningTopicRepository,
)
from app.database.repositories.progress_repository import TopicProgressRepository
from app.database.repositories.user_repository import UserRepository
from app.models.common import UserRole
from app.models.user import User
from app.schemas.admin import PasswordResetResponse, StudentImportResult
from app.schemas.auth import UserPublic, to_user_public
from app.schemas.learning import (
    LearningModuleCreate,
    LearningModulePublic,
    LearningModuleUpdate,
    LearningTopicCreate,
    LearningTopicPublic,
    LearningTopicUpdate,
)
from app.services.learning_service import (
    LearningService,
    ModuleNotFoundError,
    TopicNotFoundError,
)
from app.services.student_service import StudentNotFoundError, StudentService

router = APIRouter(prefix="/admin", tags=["admin"])


def _learning_service(
    module_repository: LearningModuleRepository = Depends(get_learning_module_repository),
    topic_repository: LearningTopicRepository = Depends(get_learning_topic_repository),
    progress_repository: TopicProgressRepository = Depends(get_topic_progress_repository),
) -> LearningService:
    return LearningService(module_repository, topic_repository, progress_repository)


@router.get("/students", response_model=list[UserPublic])
async def list_students(
    _: User = Depends(get_current_admin_user),
    user_repository: UserRepository = Depends(get_user_repository),
) -> list[UserPublic]:
    students = await user_repository.find_many({"role": UserRole.STUDENT.value}, limit=1000)
    return [to_user_public(student) for student in students]


@router.post("/students/import", response_model=StudentImportResult)
async def import_students(
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin_user),
    user_repository: UserRepository = Depends(get_user_repository),
) -> StudentImportResult:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a .csv file")

    content = await file.read()
    service = StudentService(user_repository)
    try:
        return await service.import_students_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/students/{student_id}/reset-password", response_model=PasswordResetResponse)
async def reset_student_password(
    student_id: str,
    _: User = Depends(get_current_admin_user),
    user_repository: UserRepository = Depends(get_user_repository),
) -> PasswordResetResponse:
    service = StudentService(user_repository)
    try:
        temp_password = await service.reset_password(student_id)
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return PasswordResetResponse(temporary_password=temp_password)


@router.post("/learning/modules", response_model=LearningModulePublic, status_code=status.HTTP_201_CREATED)
async def create_module(
    payload: LearningModuleCreate,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> LearningModulePublic:
    module = await service.create_module(payload)
    return LearningModulePublic(
        id=module.id,
        title=module.title,
        description=module.description,
        order=module.order,
        language=module.language,
    )


@router.put("/learning/modules/{module_id}", response_model=LearningModulePublic)
async def update_module(
    module_id: str,
    payload: LearningModuleUpdate,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> LearningModulePublic:
    try:
        module = await service.update_module(module_id, payload)
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return LearningModulePublic(
        id=module.id,
        title=module.title,
        description=module.description,
        order=module.order,
        language=module.language,
    )


@router.delete("/learning/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: str,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> None:
    try:
        await service.delete_module(module_id)
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/learning/modules/{module_id}/topics",
    response_model=LearningTopicPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_topic(
    module_id: str,
    payload: LearningTopicCreate,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> LearningTopicPublic:
    try:
        topic = await service.create_topic(module_id, payload)
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return LearningTopicPublic(
        id=topic.id,
        module_id=topic.module_id,
        title=topic.title,
        description=topic.description,
        video_url=topic.video_url,
        order=topic.order,
    )


@router.put("/learning/topics/{topic_id}", response_model=LearningTopicPublic)
async def update_topic(
    topic_id: str,
    payload: LearningTopicUpdate,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> LearningTopicPublic:
    try:
        topic = await service.update_topic(topic_id, payload)
    except TopicNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return LearningTopicPublic(
        id=topic.id,
        module_id=topic.module_id,
        title=topic.title,
        description=topic.description,
        video_url=topic.video_url,
        order=topic.order,
    )


@router.delete("/learning/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: str,
    _: User = Depends(get_current_admin_user),
    service: LearningService = Depends(_learning_service),
) -> None:
    try:
        await service.delete_topic(topic_id)
    except TopicNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
