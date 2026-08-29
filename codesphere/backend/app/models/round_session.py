from datetime import datetime, timezone

from pydantic import Field

from app.models.coding_round import AssignedQuestion
from app.models.common import MongoBaseModel, SessionStatus


class RoundSession(MongoBaseModel):
    round_id: str = Field(alias="roundId")
    student_id: str = Field(alias="studentId")
    assigned_questions: list[AssignedQuestion] = Field(default_factory=list, alias="assignedQuestions")
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="startedAt")
    expires_at: datetime = Field(alias="expiresAt")
    status: SessionStatus = SessionStatus.NOT_STARTED
    violation_count: int = Field(default=0, alias="violationCount")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
