from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.progress import TopicProgress


class TopicProgressRepository(BaseRepository[TopicProgress]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.TOPIC_PROGRESS, TopicProgress)
