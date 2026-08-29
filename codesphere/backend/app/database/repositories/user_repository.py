from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.USERS, User)
