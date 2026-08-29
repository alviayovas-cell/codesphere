from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.submission import Submission


class SubmissionRepository(BaseRepository[Submission]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.SUBMISSIONS, Submission)
