import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.core.config import settings

logger = logging.getLogger(__name__)


class Collections:
    USERS = "users"
    LEARNING_MODULES = "learning_modules"
    LEARNING_TOPICS = "learning_topics"
    PROBLEMS = "problems"
    TEST_CASES = "test_cases"
    CODING_ROUNDS = "coding_rounds"
    ROUND_SESSIONS = "round_sessions"
    SUBMISSIONS = "submissions"
    AUTOSAVES = "autosaves"
    ACTIVITY_EVENTS = "activity_events"
    TOPIC_PROGRESS = "topic_progress"


class MongoDB:
    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def connect_to_mongo() -> None:
    # tz_aware=True: without it, PyMongo/Motor return naive datetimes (UTC
    # values with no tzinfo) for anything round-tripped through Mongo, while
    # datetime.now(timezone.utc) is aware - comparing the two raises
    # TypeError. Round/session expiry logic (Phase 8+) depends on comparing
    # "now" against DB-loaded timestamps, so this must be set from the start.
    mongodb.client = AsyncIOMotorClient(
        settings.mongodb_uri, serverSelectionTimeoutMS=5000, tz_aware=True
    )
    mongodb.database = mongodb.client[settings.mongodb_db_name]
    try:
        await mongodb.client.admin.command("ping")
        logger.info("Connected to MongoDB database '%s'", settings.mongodb_db_name)
        await create_indexes()
    except Exception:
        logger.warning("Could not reach MongoDB at startup; will retry on demand.", exc_info=True)


async def close_mongo_connection() -> None:
    if mongodb.client is not None:
        mongodb.client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    if mongodb.database is None:
        raise RuntimeError("Database is not initialized. Call connect_to_mongo() first.")
    return mongodb.database


async def ping_database() -> bool:
    if mongodb.client is None:
        return False
    try:
        await mongodb.client.admin.command("ping")
        return True
    except Exception:
        return False


async def create_indexes() -> None:
    db = get_database()

    await db[Collections.USERS].create_index("email", unique=True)
    await db[Collections.USERS].create_index("registerNumber", unique=True)

    await db[Collections.LEARNING_MODULES].create_index("order")
    await db[Collections.LEARNING_TOPICS].create_index("moduleId")
    await db[Collections.LEARNING_TOPICS].create_index([("moduleId", ASCENDING), ("order", ASCENDING)])

    await db[Collections.PROBLEMS].create_index("slug", unique=True)

    await db[Collections.TEST_CASES].create_index("problemId")

    await db[Collections.CODING_ROUNDS].create_index("status")
    await db[Collections.CODING_ROUNDS].create_index("startTime")

    await db[Collections.ROUND_SESSIONS].create_index(
        [("roundId", ASCENDING), ("studentId", ASCENDING)], unique=True
    )
    await db[Collections.ROUND_SESSIONS].create_index("status")

    await db[Collections.SUBMISSIONS].create_index([("studentId", ASCENDING), ("roundId", ASCENDING)])
    await db[Collections.SUBMISSIONS].create_index("problemId")

    await db[Collections.AUTOSAVES].create_index(
        [("sessionId", ASCENDING), ("problemId", ASCENDING)], unique=True
    )

    await db[Collections.ACTIVITY_EVENTS].create_index("sessionId")
    await db[Collections.ACTIVITY_EVENTS].create_index("timestamp")

    await db[Collections.TOPIC_PROGRESS].create_index(
        [("studentId", ASCENDING), ("topicId", ASCENDING)], unique=True
    )
    await db[Collections.TOPIC_PROGRESS].create_index("studentId")

    logger.info("MongoDB indexes ensured")
