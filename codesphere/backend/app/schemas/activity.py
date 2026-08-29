from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

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

    model_config = {"populate_by_name": True}
