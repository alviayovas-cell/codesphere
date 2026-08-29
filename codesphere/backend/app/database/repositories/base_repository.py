from typing import Any, Generic, TypeVar

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase

from app.models.common import MongoBaseModel

ModelType = TypeVar("ModelType", bound=MongoBaseModel)


class BaseRepository(Generic[ModelType]):
    """Generic async CRUD repository for a single MongoDB collection."""

    def __init__(self, database: AsyncIOMotorDatabase, collection_name: str, model: type[ModelType]):
        self.collection: AsyncIOMotorCollection = database[collection_name]
        self.model = model

    async def find_by_id(self, id: str) -> ModelType | None:
        if not ObjectId.is_valid(id):
            return None
        document = await self.collection.find_one({"_id": ObjectId(id)})
        return self.model(**document) if document else None

    async def find_one(self, filter: dict[str, Any]) -> ModelType | None:
        document = await self.collection.find_one(filter)
        return self.model(**document) if document else None

    async def find_many(
        self, filter: dict[str, Any] | None = None, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        cursor = self.collection.find(filter or {}).skip(skip).limit(limit)
        return [self.model(**document) async for document in cursor]

    async def insert_one(self, item: ModelType) -> ModelType:
        payload = item.model_dump(by_alias=True, exclude={"id"})
        result = await self.collection.insert_one(payload)
        payload["_id"] = result.inserted_id
        return self.model(**payload)

    async def update_one(self, id: str, update: dict[str, Any]) -> ModelType | None:
        if not ObjectId.is_valid(id):
            return None
        await self.collection.update_one({"_id": ObjectId(id)}, {"$set": update})
        return await self.find_by_id(id)

    async def delete_one(self, id: str) -> bool:
        if not ObjectId.is_valid(id):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(id)})
        return result.deleted_count > 0

    async def count(self, filter: dict[str, Any] | None = None) -> int:
        return await self.collection.count_documents(filter or {})
