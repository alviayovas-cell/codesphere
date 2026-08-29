from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.activity_event import ActivityEvent


class ActivityEventRepository(BaseRepository[ActivityEvent]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.ACTIVITY_EVENTS, ActivityEvent)
