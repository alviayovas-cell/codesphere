from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.mongodb import close_mongo_connection, connect_to_mongo
from app.routes import admin, auth, code_execution, coding_rounds, health, learning, problems, results


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(learning.router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(code_execution.router, prefix="/api")
app.include_router(coding_rounds.router, prefix="/api")
app.include_router(results.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "CodeSphere API is running"}
