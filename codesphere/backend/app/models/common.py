from enum import Enum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


def _validate_object_id(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, str) and ObjectId.is_valid(value):
        return value
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class MongoBaseModel(BaseModel):
    """Base model for documents stored in MongoDB.

    Maps Mongo's `_id` to `id` and accepts/serializes camelCase field
    names (matching the DB design) while keeping snake_case attributes
    in Python.
    """

    id: PyObjectId | None = Field(default=None, alias="_id")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class TestCaseVisibility(str, Enum):
    PUBLIC = "public"
    HIDDEN = "hidden"


class RoundStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"


class SessionStatus(str, Enum):
    NOT_STARTED = "not_started"
    ACTIVE = "active"
    SUBMITTED = "submitted"
    EXPIRED = "expired"
    LOCKED = "locked"


class SubmissionType(str, Enum):
    RUN = "run"
    SUBMIT = "submit"
    AUTO_SUBMIT = "auto_submit"


class Verdict(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    COMPILATION_ERROR = "compilation_error"
    RUNTIME_ERROR = "runtime_error"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    INTERNAL_ERROR = "internal_error"


class ActivityEventType(str, Enum):
    VISIBILITY_HIDDEN = "visibility_hidden"
    VISIBILITY_RESTORED = "visibility_restored"
    WINDOW_BLUR = "window_blur"
    WINDOW_FOCUS = "window_focus"
    WARNING = "warning"
    AUTO_SUBMIT = "auto_submit"
