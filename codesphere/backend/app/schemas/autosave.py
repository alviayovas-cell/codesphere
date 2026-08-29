from datetime import datetime

from pydantic import BaseModel, Field


class AutosaveRequest(BaseModel):
    problem_id: str = Field(validation_alias="problemId")
    code: str


class AutosavePublic(BaseModel):
    problem_id: str = Field(serialization_alias="problemId")
    code: str
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}
