from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.learning import LearningModule, LearningTopic


class LearningModuleRepository(BaseRepository[LearningModule]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.LEARNING_MODULES, LearningModule)


class LearningTopicRepository(BaseRepository[LearningTopic]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.LEARNING_TOPICS, LearningTopic)
