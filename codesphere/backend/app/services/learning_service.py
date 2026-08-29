from app.database.repositories.learning_repository import (
    LearningModuleRepository,
    LearningTopicRepository,
)
from app.database.repositories.progress_repository import TopicProgressRepository
from app.models.learning import LearningModule, LearningTopic
from app.models.progress import TopicProgress
from app.schemas.learning import (
    LearningModuleCreate,
    LearningModulePublic,
    LearningModuleUpdate,
    LearningTopicCreate,
    LearningTopicPublic,
    LearningTopicUpdate,
    ModuleProgress,
    ProgressSummary,
)


class ModuleNotFoundError(Exception):
    pass


class TopicNotFoundError(Exception):
    pass


class LearningService:
    def __init__(
        self,
        module_repository: LearningModuleRepository,
        topic_repository: LearningTopicRepository,
        progress_repository: TopicProgressRepository,
    ):
        self.module_repository = module_repository
        self.topic_repository = topic_repository
        self.progress_repository = progress_repository

    # -- student-facing reads -------------------------------------------------

    async def list_modules_with_topics(self, student_id: str | None) -> list[LearningModulePublic]:
        modules = await self.module_repository.find_many(limit=1000)
        modules.sort(key=lambda m: m.order)

        completed_topic_ids: set[str] = set()
        if student_id is not None:
            progress_entries = await self.progress_repository.find_many(
                {"studentId": student_id}, limit=10000
            )
            completed_topic_ids = {entry.topic_id for entry in progress_entries}

        result: list[LearningModulePublic] = []
        for module in modules:
            topics = await self.topic_repository.find_many({"moduleId": module.id}, limit=1000)
            topics.sort(key=lambda t: t.order)
            topic_publics = [
                self._to_topic_public(topic, completed=topic.id in completed_topic_ids)
                for topic in topics
            ]
            result.append(
                LearningModulePublic(
                    id=module.id,
                    title=module.title,
                    description=module.description,
                    order=module.order,
                    language=module.language,
                    topics=topic_publics,
                    completed_topics=sum(1 for t in topic_publics if t.completed),
                    total_topics=len(topic_publics),
                )
            )
        return result

    async def get_topic(self, topic_id: str, student_id: str | None) -> LearningTopicPublic:
        topic = await self.topic_repository.find_by_id(topic_id)
        if topic is None:
            raise TopicNotFoundError("Topic not found")

        completed = False
        if student_id is not None:
            entry = await self.progress_repository.find_one(
                {"studentId": student_id, "topicId": topic_id}
            )
            completed = entry is not None

        return self._to_topic_public(topic, completed=completed)

    async def get_progress_summary(self, student_id: str) -> ProgressSummary:
        modules = await self.module_repository.find_many(limit=1000)
        modules.sort(key=lambda m: m.order)

        progress_entries = await self.progress_repository.find_many(
            {"studentId": student_id}, limit=10000
        )
        completed_topic_ids = {entry.topic_id for entry in progress_entries}

        module_summaries: list[ModuleProgress] = []
        total_topics = 0
        total_completed = 0
        for module in modules:
            topics = await self.topic_repository.find_many({"moduleId": module.id}, limit=1000)
            completed_count = sum(1 for t in topics if t.id in completed_topic_ids)
            total_topics += len(topics)
            total_completed += completed_count
            module_summaries.append(
                ModuleProgress(
                    module_id=module.id,
                    module_title=module.title,
                    completed_topics=completed_count,
                    total_topics=len(topics),
                )
            )

        return ProgressSummary(
            completed_topics=total_completed, total_topics=total_topics, modules=module_summaries
        )

    # -- progress mutation ------------------------------------------------

    async def mark_topic_complete(self, student_id: str, topic_id: str) -> None:
        topic = await self.topic_repository.find_by_id(topic_id)
        if topic is None:
            raise TopicNotFoundError("Topic not found")

        existing = await self.progress_repository.find_one(
            {"studentId": student_id, "topicId": topic_id}
        )
        if existing is not None:
            return

        await self.progress_repository.insert_one(
            TopicProgress(student_id=student_id, topic_id=topic_id, module_id=topic.module_id)
        )

    async def unmark_topic_complete(self, student_id: str, topic_id: str) -> None:
        existing = await self.progress_repository.find_one(
            {"studentId": student_id, "topicId": topic_id}
        )
        if existing is not None and existing.id is not None:
            await self.progress_repository.delete_one(existing.id)

    # -- admin CRUD ---------------------------------------------------------

    async def create_module(self, payload: LearningModuleCreate) -> LearningModule:
        return await self.module_repository.insert_one(
            LearningModule(
                title=payload.title,
                description=payload.description,
                order=payload.order,
                language=payload.language,
            )
        )

    async def update_module(self, module_id: str, payload: LearningModuleUpdate) -> LearningModule:
        update = payload.model_dump(exclude_unset=True)
        if not update:
            module = await self.module_repository.find_by_id(module_id)
            if module is None:
                raise ModuleNotFoundError("Module not found")
            return module

        updated = await self.module_repository.update_one(module_id, update)
        if updated is None:
            raise ModuleNotFoundError("Module not found")
        return updated

    async def delete_module(self, module_id: str) -> None:
        module = await self.module_repository.find_by_id(module_id)
        if module is None:
            raise ModuleNotFoundError("Module not found")

        topics = await self.topic_repository.find_many({"moduleId": module_id}, limit=1000)
        for topic in topics:
            if topic.id is not None:
                await self._delete_topic_cascade(topic.id)

        await self.module_repository.delete_one(module_id)

    async def create_topic(self, module_id: str, payload: LearningTopicCreate) -> LearningTopic:
        module = await self.module_repository.find_by_id(module_id)
        if module is None:
            raise ModuleNotFoundError("Module not found")

        return await self.topic_repository.insert_one(
            LearningTopic(
                module_id=module_id,
                title=payload.title,
                description=payload.description,
                video_url=payload.video_url,
                order=payload.order,
            )
        )

    async def update_topic(self, topic_id: str, payload: LearningTopicUpdate) -> LearningTopic:
        update = {k: v for k, v in payload.model_dump(by_alias=True, exclude_unset=True).items()}
        if not update:
            topic = await self.topic_repository.find_by_id(topic_id)
            if topic is None:
                raise TopicNotFoundError("Topic not found")
            return topic

        updated = await self.topic_repository.update_one(topic_id, update)
        if updated is None:
            raise TopicNotFoundError("Topic not found")
        return updated

    async def delete_topic(self, topic_id: str) -> None:
        topic = await self.topic_repository.find_by_id(topic_id)
        if topic is None:
            raise TopicNotFoundError("Topic not found")
        await self._delete_topic_cascade(topic_id)

    async def _delete_topic_cascade(self, topic_id: str) -> None:
        progress_entries = await self.progress_repository.find_many({"topicId": topic_id}, limit=10000)
        for entry in progress_entries:
            if entry.id is not None:
                await self.progress_repository.delete_one(entry.id)
        await self.topic_repository.delete_one(topic_id)

    @staticmethod
    def _to_topic_public(topic: LearningTopic, completed: bool) -> LearningTopicPublic:
        return LearningTopicPublic(
            id=topic.id,
            module_id=topic.module_id,
            title=topic.title,
            description=topic.description,
            video_url=topic.video_url,
            order=topic.order,
            completed=completed,
        )
