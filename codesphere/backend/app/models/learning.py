from datetime import datetime, timezone

from pydantic import Field

from app.models.common import MongoBaseModel


class LearningModule(MongoBaseModel):
    title: str
    description: str
    order: int
    language: str = "C"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")


class LearningTopic(MongoBaseModel):
    module_id: str = Field(alias="moduleId")
    title: str
    description: str
    video_url: str | None = Field(default=None, alias="videoUrl")
    order: int
