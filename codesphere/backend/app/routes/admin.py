from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import get_current_admin_user, get_user_repository
from app.database.repositories.user_repository import UserRepository
from app.models.common import UserRole
from app.models.user import User
from app.schemas.admin import PasswordResetResponse, StudentImportResult
from app.schemas.auth import UserPublic, to_user_public
from app.services.student_service import StudentNotFoundError, StudentService

router = APIRouter(prefix="/admin", tags=["admin"])


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
