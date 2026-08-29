from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.round_session import RoundSession


class RoundSessionRepository(BaseRepository[RoundSession]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.ROUND_SESSIONS, RoundSession)
