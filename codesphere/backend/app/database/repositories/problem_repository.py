from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import Collections
from app.database.repositories.base_repository import BaseRepository
from app.models.problem import Problem, TestCase


class ProblemRepository(BaseRepository[Problem]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.PROBLEMS, Problem)


class TestCaseRepository(BaseRepository[TestCase]):
    def __init__(self, database: AsyncIOMotorDatabase):
        super().__init__(database, Collections.TEST_CASES, TestCase)
