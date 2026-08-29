from datetime import datetime, timezone
from typing import Any

from pydantic import Field

from app.models.common import ActivityEventType, MongoBaseModel


class ActivityEvent(MongoBaseModel):
    session_id: str = Field(alias="sessionId")
    event_type: ActivityEventType = Field(alias="eventType")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)
