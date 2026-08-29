from pydantic import BaseModel, EmailStr, Field

from app.models.common import UserRole
from app.models.user import User


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    register_number: str = Field(serialization_alias="registerNumber")
    student_class: str = Field(serialization_alias="class")
    role: UserRole
    must_change_password: bool = Field(serialization_alias="mustChangePassword")

    model_config = {"populate_by_name": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


def to_user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        name=user.name,
        email=user.email,
        register_number=user.register_number,
        student_class=user.student_class,
        role=user.role,
        must_change_password=user.must_change_password,
    )
