from pydantic import BaseModel, EmailStr, Field


class StudentCreate(BaseModel):
    """Admin-entered single student, as opposed to a CSV row - same
    required fields, but the admin sets the real password directly
    instead of a system-generated temporary one."""

    name: str = Field(min_length=1)
    email: EmailStr
    register_number: str = Field(min_length=1, validation_alias="registerNumber")
    student_class: str = Field(min_length=1, validation_alias="class")
    password: str = Field(min_length=8)

    model_config = {"populate_by_name": True}


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
