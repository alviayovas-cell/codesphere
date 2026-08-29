from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.coding_round import CodingRound


class CodingRoundRepository(BaseRepository[CodingRound]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.CODING_ROUNDS, CodingRound)
