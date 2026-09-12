from datetime import datetime, timezone

from pydantic import Field

from app.core.languages import DEFAULT_LANGUAGE, SupportedLanguage
from app.models.common import MongoBaseModel


class Autosave(MongoBaseModel):
    session_id: str = Field(alias="sessionId")
    problem_id: str = Field(alias="problemId")
    code: str
    language: SupportedLanguage = DEFAULT_LANGUAGE
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
