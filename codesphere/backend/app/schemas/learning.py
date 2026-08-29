from pydantic import BaseModel, Field


class LearningModuleCreate(BaseModel):
    title: str
    description: str
    order: int
    language: str = "C"


class LearningModuleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    order: int | None = None
    language: str | None = None


class LearningTopicCreate(BaseModel):
    title: str
    description: str
    video_url: str | None = Field(default=None, serialization_alias="videoUrl", validation_alias="videoUrl")
    order: int

    model_config = {"populate_by_name": True}


class LearningTopicUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    video_url: str | None = Field(default=None, serialization_alias="videoUrl", validation_alias="videoUrl")
    order: int | None = None

    model_config = {"populate_by_name": True}


class LearningTopicPublic(BaseModel):
    id: str
    module_id: str = Field(serialization_alias="moduleId")
    title: str
    description: str
    video_url: str | None = Field(default=None, serialization_alias="videoUrl")
    order: int
    completed: bool = False

    model_config = {"populate_by_name": True}


class LearningModulePublic(BaseModel):
    id: str
    title: str
    description: str
    order: int
    language: str
    topics: list[LearningTopicPublic] = Field(default_factory=list)
    completed_topics: int = Field(default=0, serialization_alias="completedTopics")
    total_topics: int = Field(default=0, serialization_alias="totalTopics")

    model_config = {"populate_by_name": True}


class ModuleProgress(BaseModel):
    module_id: str = Field(serialization_alias="moduleId")
    module_title: str = Field(serialization_alias="moduleTitle")
    completed_topics: int = Field(serialization_alias="completedTopics")
    total_topics: int = Field(serialization_alias="totalTopics")

    model_config = {"populate_by_name": True}


class ProgressSummary(BaseModel):
    completed_topics: int = Field(serialization_alias="completedTopics")
    total_topics: int = Field(serialization_alias="totalTopics")
    modules: list[ModuleProgress]

    model_config = {"populate_by_name": True}
