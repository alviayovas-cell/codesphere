from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user, get_user_repository
from app.database.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LoginResponse, UserPublic, to_user_public
from app.services.auth_service import AuthService, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest, user_repository: UserRepository = Depends(get_user_repository)
) -> LoginResponse:
    service = AuthService(user_repository)
    try:
        user, token = await service.login(payload.email, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return LoginResponse(access_token=token, user=to_user_public(user))


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return to_user_public(current_user)


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    user_repository: UserRepository = Depends(get_user_repository),
) -> dict[str, str]:
    service = AuthService(user_repository)
    try:
        await service.change_password(current_user, payload.current_password, payload.new_password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return {"message": "Password changed successfully"}
