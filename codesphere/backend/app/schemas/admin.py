from pydantic import BaseModel, EmailStr, Field


class StudentImportError(BaseModel):
    row: int
    reason: str


class CreatedStudentCredential(BaseModel):
    id: str
    name: str
    email: EmailStr
    register_number: str = Field(serialization_alias="registerNumber")
    temporary_password: str = Field(serialization_alias="temporaryPassword")

    model_config = {"populate_by_name": True}


class StudentImportResult(BaseModel):
    created: int
    skipped: list[StudentImportError]
    created_students: list[CreatedStudentCredential] = Field(
        default_factory=list, serialization_alias="createdStudents"
    )

    model_config = {"populate_by_name": True}


class PasswordResetResponse(BaseModel):
    temporary_password: str = Field(serialization_alias="temporaryPassword")

    model_config = {"populate_by_name": True}
