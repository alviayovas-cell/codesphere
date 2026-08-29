from fastapi import APIRouter
from rq import Worker

from app.database.mongodb import ping_database
from app.workers.queue_config import QUEUE_NAMES_BY_PRIORITY, get_queue, get_redis_connection

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "codesphere-api"}


@router.get("/health/db")
async def database_health_check() -> dict[str, str]:
    is_connected = await ping_database()
    return {"status": "ok" if is_connected else "unavailable", "database": "mongodb"}


@router.get("/health/queue")
def queue_health_check() -> dict:
    try:
        connection = get_redis_connection()
        connection.ping()
    except Exception:
        return {"status": "unavailable", "redis": "unreachable", "queues": {}, "workers": 0}

    queues = {
        name: get_queue(name, connection).count for name in QUEUE_NAMES_BY_PRIORITY
    }
    worker_count = len(Worker.all(connection=connection))

    return {"status": "ok", "redis": "connected", "queues": queues, "workers": worker_count}
