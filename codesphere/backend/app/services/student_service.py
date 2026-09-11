import asyncio
import csv
import io
from datetime import datetime, timezone

from app.core.security import generate_temporary_password, hash_password
from app.database.repositories.user_repository import UserRepository
from app.models.common import UserRole
from app.models.user import User
from app.schemas.admin import CreatedStudentCredential, StudentCreate, StudentImportError, StudentImportResult

REQUIRED_COLUMNS = {"Name", "RegisterNumber", "Email", "Class"}


class StudentNotFoundError(Exception):
    pass


class DuplicateEmailError(Exception):
    pass


class DuplicateRegisterNumberError(Exception):
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

    async def create_student(self, payload: StudentCreate) -> User:
        """Admin 'Add Student' - one manually-entered record, kept
        separate from the CSV-import loop above (rather than refactored
        to share it) so this addition can't touch that already-working
        path, but produces an identical kind of record: same required
        fields, same bcrypt hashing, same role=student, same
        mustChangePassword=True first-login behavior (the admin knows
        the exact password they just typed, same as a shared CSV
        temporary password - the student should still set their own on
        first login)."""
        email = payload.email.lower()

        if await self.user_repository.find_one({"email": email}):
            raise DuplicateEmailError("Email already exists")
        if await self.user_repository.find_one({"registerNumber": payload.register_number}):
            raise DuplicateRegisterNumberError("Register number already exists")

        password_hash = await asyncio.to_thread(hash_password, payload.password)
        return await self.user_repository.insert_one(
            User(
                name=payload.name,
                email=email,
                password_hash=password_hash,
                register_number=payload.register_number,
                student_class=payload.student_class,
                role=UserRole.STUDENT,
                must_change_password=True,
            )
        )

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

    async def set_active(self, student_id: str, is_active: bool) -> User:
        """Deactivate (is_active=False) or reactivate (True) a student
        account. The users document is never touched by this beyond the
        isActive flag - submissions, sessions, autosaves, and every other
        assessment record are completely untouched, and reversible by
        calling this again with the opposite value.

        Bumping updatedAt here is deliberate, not incidental: it's the
        same field get_current_user already compares a token's `iat`
        against to reject stale tokens (Phase 13's password-change guard).
        Reusing that existing check means deactivating someone who is
        already mid-session invalidates their current token on their very
        next request too, not just future login attempts - no separate
        mechanism needed."""
        user = await self.user_repository.find_by_id(student_id)
        if user is None or user.role != UserRole.STUDENT:
            raise StudentNotFoundError("Student not found")

        updated = await self.user_repository.update_one(
            student_id,
            {"isActive": is_active, "updatedAt": datetime.now(timezone.utc)},
        )
        return updated or user

    async def delete_student(self, student_id: str) -> None:
        """Permanently removes a student's personal account/profile
        (name, email, registerNumber, class, passwordHash - the users
        document is the only place any of that lives). Every assessment
        record (submissions, round_sessions, autosaves, activity_events,
        topic_progress) references the student only by this id, never by
        name/email, and every place that resolves a student's name from
        one of those ids already falls back to "Unknown student"/"-" for
        an id that no longer matches a user - so institutional records
        survive intact without this needing to touch any other
        collection. Irreversible: unlike set_active, there is no document
        left to reactivate."""
        user = await self.user_repository.find_by_id(student_id)
        if user is None or user.role != UserRole.STUDENT:
            raise StudentNotFoundError("Student not found")

        await self.user_repository.delete_one(student_id)
