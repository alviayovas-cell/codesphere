from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.autosave import Autosave


class AutosaveRepository(BaseRepository[Autosave]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.AUTOSAVES, Autosave)
