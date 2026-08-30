import asyncio
import csv
import io
from datetime import datetime, timezone

from app.core.security import generate_temporary_password, hash_password
from app.database.repositories.user_repository import UserRepository
from app.models.common import UserRole
from app.models.user import User
from app.schemas.admin import CreatedStudentCredential, StudentImportError, StudentImportResult

REQUIRED_COLUMNS = {"Name", "RegisterNumber", "Email", "Class"}


class StudentNotFoundError(Exception):
    pass


class StudentService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def import_students_csv(self, content: bytes) -> StudentImportResult:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("CSV file must be UTF-8 encoded") from exc

        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None or not REQUIRED_COLUMNS.issubset(set(reader.fieldnames)):
            raise ValueError(f"CSV must contain columns: {', '.join(sorted(REQUIRED_COLUMNS))}")

        seen_emails: set[str] = set()
        seen_register_numbers: set[str] = set()
        skipped: list[StudentImportError] = []
        created: list[CreatedStudentCredential] = []

        for row_number, row in enumerate(reader, start=2):
            name = (row.get("Name") or "").strip()
            register_number = (row.get("RegisterNumber") or "").strip()
            email = (row.get("Email") or "").strip().lower()
            student_class = (row.get("Class") or "").strip()

            if not name or not register_number or not email or not student_class:
                skipped.append(StudentImportError(row=row_number, reason="Missing required field(s)"))
                continue

            if email in seen_emails or register_number in seen_register_numbers:
                skipped.append(StudentImportError(row=row_number, reason="Duplicate within CSV file"))
                continue

            if await self.user_repository.find_one({"email": email}):
                skipped.append(StudentImportError(row=row_number, reason="Email already registered"))
                continue

            if await self.user_repository.find_one({"registerNumber": register_number}):
                skipped.append(
                    StudentImportError(row=row_number, reason="Register number already registered")
                )
                continue

            temp_password = generate_temporary_password()
            # bcrypt is synchronous/CPU-bound - offload it so importing a
            # large CSV of students doesn't block the event loop (and every
            # other in-flight request) for the sum of every row's hash time.
            password_hash = await asyncio.to_thread(hash_password, temp_password)
            user = User(
                name=name,
                email=email,
                password_hash=password_hash,
                register_number=register_number,
                student_class=student_class,
                role=UserRole.STUDENT,
                must_change_password=True,
            )
            saved = await self.user_repository.insert_one(user)

            seen_emails.add(email)
            seen_register_numbers.add(register_number)
            created.append(
                CreatedStudentCredential(
                    id=saved.id,
                    name=saved.name,
                    email=saved.email,
                    register_number=saved.register_number,
                    temporary_password=temp_password,
                )
            )

        return StudentImportResult(created=len(created), skipped=skipped, created_students=created)

    async def reset_password(self, student_id: str) -> str:
        user = await self.user_repository.find_by_id(student_id)
        if user is None or user.role != UserRole.STUDENT:
            raise StudentNotFoundError("Student not found")

        temp_password = generate_temporary_password()
        new_hash = await asyncio.to_thread(hash_password, temp_password)
        await self.user_repository.update_one(
            student_id,
            {
                "passwordHash": new_hash,
                "mustChangePassword": True,
                "updatedAt": datetime.now(timezone.utc),
            },
        )
        return temp_password
