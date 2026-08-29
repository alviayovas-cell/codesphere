from datetime import datetime, timezone

from pydantic import Field

from app.models.common import MongoBaseModel


class TopicProgress(MongoBaseModel):
    """Tracks a single student's completion of a single learning topic.

    Not one of the collections explicitly listed in the design doc, but
    required to implement "mark topics as completed" / progress
    tracking (spec section 6). Kept as its own small join collection
    rather than a field on User or LearningTopic.
    """

    student_id: str = Field(alias="studentId")
    topic_id: str = Field(alias="topicId")
    module_id: str = Field(alias="moduleId")
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="completedAt")
