from datetime import datetime

from pydantic import BaseModel, Field

from app.core.languages import DEFAULT_LANGUAGE, SupportedLanguage


class AutosaveRequest(BaseModel):
    problem_id: str = Field(validation_alias="problemId")
    code: str
    language: SupportedLanguage = DEFAULT_LANGUAGE


class AutosavePublic(BaseModel):
    problem_id: str = Field(serialization_alias="problemId")
    code: str
    language: SupportedLanguage = DEFAULT_LANGUAGE
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}
