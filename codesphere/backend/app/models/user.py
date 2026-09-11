from datetime import datetime, timezone

from pydantic import EmailStr, Field

from app.models.common import MongoBaseModel, UserRole


class User(MongoBaseModel):
    name: str
    email: EmailStr
    password_hash: str = Field(alias="passwordHash")
    register_number: str = Field(alias="registerNumber")
    student_class: str = Field(alias="class")
    role: UserRole
    must_change_password: bool = Field(default=False, alias="mustChangePassword")
    # Missing on documents created before this field existed - Pydantic's
    # default (True) applies to them automatically, so every pre-existing
    # account is treated as active with no migration needed.
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
