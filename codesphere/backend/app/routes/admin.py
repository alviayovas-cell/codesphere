from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import (
    get_coding_round_repository,
    get_current_admin_user,
    get_learning_module_repository,
    get_learning_topic_repository,
    get_problem_repository,
    get_round_session_repository,
    get_test_case_repository,
    get_topic_progress_repository,
    get_user_repository,
)
from app.database.repositories.coding_round_repository import CodingRoundRepository
from app.database.repositories.learning_repository import (
    LearningModuleRepository,
    LearningTopicRepository,
)
from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
from app.database.repositories.progress_repository import TopicProgressRepository
from app.database.repositories.round_session_repository import RoundSessionRepository
from app.database.repositories.user_repository import UserRepository
from app.models.common import UserRole
from app.models.user import User
from app.schemas.admin import PasswordResetResponse, StudentImportResult
from app.schemas.auth import UserPublic, to_user_public
from app.schemas.coding_round import CodingRoundAdminView, CodingRoundCreate, CodingRoundUpdate
from app.schemas.learning import (
    LearningModuleCreate,
    LearningModulePublic,
    LearningModuleUpdate,
    LearningTopicCreate,
    LearningTopicPublic,
    LearningTopicUpdate,
)
from app.schemas.problem import (
    ProblemAdminView,
    ProblemCreate,
    ProblemUpdate,
    TestCaseAdminView,
    TestCaseCreate,
    TestCaseUpdate,
)
from app.services.coding_round_service import (
    CodingRoundService,
    InvalidRoundConfigError,
    RoundNotFoundError,
)
from app.services.learning_service import (
    LearningService,
    ModuleNotFoundError,
    TopicNotFoundError,
)
from app.services.problem_service import (
    DuplicateSlugError,
    ProblemNotFoundError,
    ProblemService,
    TestCaseNotFoundError,
)
from app.services.student_service import StudentNotFoundError, StudentService

router = APIRouter(prefix="/admin", tags=["admin"])


def _learning_service(
    module_repository: LearningModuleRepository = Depends(get_learning_module_repository),
    topic_repository: LearningTopicRepository = Depends(get_learning_topic_repository),
    progress_repository: TopicProgressRepository = Depends(get_topic_progress_repository),
) -> LearningService:
    return LearningService(module_repository, topic_repository, progress_repository)


def _problem_service(
    problem_repository: ProblemRepository = Depends(get_problem_repository),
    test_case_repository: TestCaseRepository = Depends(get_test_case_repository),
) -> ProblemService:
    return ProblemService(problem_repository, test_case_repository)


def _round_service(
    round_repository: CodingRoundRepository = Depends(get_coding_round_repository),
    session_repository: RoundSessionRepository = Depends(get_round_session_repository),
    problem_repository: ProblemRepository = Depends(get_problem_repository),
) -> CodingRoundService:
    return CodingRoundService(round_repository, session_repository, problem_repository)


def _to_round_admin_view(round_) -> CodingRoundAdminView:
    return CodingRoundAdminView(
        id=round_.id,
        title=round_.title,
        description=round_.description,
        duration_minutes=round_.duration_minutes,
        start_time=round_.start_time,
        end_time=round_.end_time,
        status=round_.status,
        problem_ids=round_.problem_ids,
        assessment_configuration=round_.assessment_configuration.model_dump(),
        result_configuration=round_.result_configuration.model_dump(),
    )


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


@router.post("/problems", response_model=ProblemAdminView, status_code=status.HTTP_201_CREATED)
async def create_problem(
    payload: ProblemCreate,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> ProblemAdminView:
    try:
        problem = await service.create_problem(payload)
    except DuplicateSlugError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return await service.get_problem_admin(problem.id)


@router.get("/problems/{problem_id}", response_model=ProblemAdminView)
async def get_problem_admin(
    problem_id: str,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> ProblemAdminView:
    try:
        return await service.get_problem_admin(problem_id)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/problems/{problem_id}", response_model=ProblemAdminView)
async def update_problem(
    problem_id: str,
    payload: ProblemUpdate,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> ProblemAdminView:
    try:
        await service.update_problem(problem_id, payload)
        return await service.get_problem_admin(problem_id)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: str,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> None:
    try:
        await service.delete_problem(problem_id)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/problems/{problem_id}/test-cases",
    response_model=TestCaseAdminView,
    status_code=status.HTTP_201_CREATED,
)
async def create_test_case(
    problem_id: str,
    payload: TestCaseCreate,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> TestCaseAdminView:
    try:
        test_case = await service.create_test_case(problem_id, payload)
    except ProblemNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return TestCaseAdminView(
        id=test_case.id,
        problem_id=test_case.problem_id,
        input=test_case.input,
        expected_output=test_case.expected_output,
        visibility=test_case.visibility,
    )


@router.put("/test-cases/{test_case_id}", response_model=TestCaseAdminView)
async def update_test_case(
    test_case_id: str,
    payload: TestCaseUpdate,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> TestCaseAdminView:
    try:
        test_case = await service.update_test_case(test_case_id, payload)
    except TestCaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return TestCaseAdminView(
        id=test_case.id,
        problem_id=test_case.problem_id,
        input=test_case.input,
        expected_output=test_case.expected_output,
        visibility=test_case.visibility,
    )


@router.delete("/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    test_case_id: str,
    _: User = Depends(get_current_admin_user),
    service: ProblemService = Depends(_problem_service),
) -> None:
    try:
        await service.delete_test_case(test_case_id)
    except TestCaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/rounds", response_model=list[CodingRoundAdminView])
async def list_rounds(
    _: User = Depends(get_current_admin_user),
    service: CodingRoundService = Depends(_round_service),
) -> list[CodingRoundAdminView]:
    rounds = await service.list_rounds_admin()
    return [_to_round_admin_view(r) for r in rounds]


@router.get("/rounds/{round_id}", response_model=CodingRoundAdminView)
async def get_round(
    round_id: str,
    _: User = Depends(get_current_admin_user),
    service: CodingRoundService = Depends(_round_service),
) -> CodingRoundAdminView:
    try:
        round_ = await service.get_round_admin(round_id)
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_round_admin_view(round_)


@router.post("/rounds", response_model=CodingRoundAdminView, status_code=status.HTTP_201_CREATED)
async def create_round(
    payload: CodingRoundCreate,
    _: User = Depends(get_current_admin_user),
    service: CodingRoundService = Depends(_round_service),
) -> CodingRoundAdminView:
    try:
        round_ = await service.create_round(payload)
    except InvalidRoundConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_round_admin_view(round_)


@router.put("/rounds/{round_id}", response_model=CodingRoundAdminView)
async def update_round(
    round_id: str,
    payload: CodingRoundUpdate,
    _: User = Depends(get_current_admin_user),
    service: CodingRoundService = Depends(_round_service),
) -> CodingRoundAdminView:
    try:
        round_ = await service.update_round(round_id, payload)
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidRoundConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_round_admin_view(round_)


@router.delete("/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_round(
    round_id: str,
    _: User = Depends(get_current_admin_user),
    service: CodingRoundService = Depends(_round_service),
) -> None:
    try:
        await service.delete_round(round_id)
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
