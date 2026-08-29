from fastapi import APIRouter

from app.database.mongodb import ping_database

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "codesphere-api"}


@router.get("/health/db")
async def database_health_check() -> dict[str, str]:
    is_connected = await ping_database()
    return {"status": "ok" if is_connected else "unavailable", "database": "mongodb"}
