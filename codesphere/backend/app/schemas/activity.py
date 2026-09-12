from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.core.languages import DEFAULT_LANGUAGE, SupportedLanguage
from app.models.common import ActivityEventType, SessionStatus


class ActivityEventCreate(BaseModel):
    event_type: ActivityEventType = Field(validation_alias="eventType")


class ActivityEventPublic(BaseModel):
    id: str
    session_id: str = Field(serialization_alias="sessionId")
    event_type: ActivityEventType = Field(serialization_alias="eventType")
    timestamp: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class AssignedProblemSummary(BaseModel):
    """One problem assigned to a session, in assigned order - lets the
    admin pick which problem's autosaved code to view."""

    problem_id: str = Field(serialization_alias="problemId")
    title: str

    model_config = {"populate_by_name": True}


class SessionMonitorSummary(BaseModel):
    """Admin monitoring row: one student's session in a round."""

    session_id: str = Field(serialization_alias="sessionId")
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    student_register_number: str = Field(serialization_alias="studentRegisterNumber")
    status: SessionStatus
    violation_count: int = Field(serialization_alias="violationCount")
    started_at: datetime = Field(serialization_alias="startedAt")
    expires_at: datetime = Field(serialization_alias="expiresAt")
    assigned_problems: list[AssignedProblemSummary] = Field(
        default_factory=list, serialization_alias="assignedProblems"
    )

    model_config = {"populate_by_name": True}


class StudentAutosaveView(BaseModel):
    """Admin-only view of a student's LATEST autosaved code for one
    problem in one round. `code`/`updatedAt` are null when the student has
    no autosave for this problem yet (never opened it)."""

    round_id: str = Field(serialization_alias="roundId")
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    student_register_number: str = Field(serialization_alias="studentRegisterNumber")
    problem_id: str = Field(serialization_alias="problemId")
    problem_title: str = Field(serialization_alias="problemTitle")
    language: SupportedLanguage = DEFAULT_LANGUAGE
    code: str | None = None
    updated_at: datetime | None = Field(default=None, serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}
