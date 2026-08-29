import re

from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
from app.models.common import TestCaseVisibility
from app.models.problem import Problem, ProblemExample, TestCase
from app.schemas.problem import (
    ProblemAdminView,
    ProblemCreate,
    ProblemPublic,
    ProblemSummary,
    ProblemUpdate,
    TestCaseAdminView,
    TestCaseCreate,
    TestCasePublic,
    TestCaseUpdate,
)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    slug = _SLUG_RE.sub("-", title.strip().lower()).strip("-")
    return slug or "problem"


class ProblemNotFoundError(Exception):
    pass


class TestCaseNotFoundError(Exception):
    pass


class DuplicateSlugError(Exception):
    pass


class ProblemService:
    def __init__(self, problem_repository: ProblemRepository, test_case_repository: TestCaseRepository):
        self.problem_repository = problem_repository
        self.test_case_repository = test_case_repository

    # -- student-facing reads -------------------------------------------------

    async def list_problems(self) -> list[ProblemSummary]:
        problems = await self.problem_repository.find_many(limit=1000)
        problems.sort(key=lambda p: p.created_at)
        return [
            ProblemSummary(
                id=p.id,
                title=p.title,
                slug=p.slug,
                difficulty=p.difficulty,
                topic=p.topic,
                language=p.language,
                marks=p.marks,
            )
            for p in problems
        ]

    async def get_problem_public(self, problem_id: str) -> ProblemPublic:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        public_cases = await self.test_case_repository.find_many(
            {"problemId": problem_id, "visibility": TestCaseVisibility.PUBLIC.value}, limit=1000
        )
        return self._to_public(problem, public_cases)

    # -- admin -----------------------------------------------------------------

    async def get_problem_admin(self, problem_id: str) -> ProblemAdminView:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        all_cases = await self.test_case_repository.find_many({"problemId": problem_id}, limit=1000)
        public_cases = [c for c in all_cases if c.visibility == TestCaseVisibility.PUBLIC]

        return ProblemAdminView(
            id=problem.id,
            title=problem.title,
            slug=problem.slug,
            description=problem.description,
            input_format=problem.input_format,
            output_format=problem.output_format,
            constraints=problem.constraints,
            examples=problem.examples,
            difficulty=problem.difficulty,
            topic=problem.topic,
            language=problem.language,
            marks=problem.marks,
            public_test_cases=[
                TestCasePublic(input=c.input, expected_output=c.expected_output) for c in public_cases
            ],
            test_cases=[self._to_admin_test_case(c) for c in all_cases],
        )

    async def create_problem(self, payload: ProblemCreate) -> Problem:
        slug = payload.slug or slugify(payload.title)
        if await self.problem_repository.find_one({"slug": slug}):
            raise DuplicateSlugError(f"A problem with slug '{slug}' already exists")

        return await self.problem_repository.insert_one(
            Problem(
                title=payload.title,
                slug=slug,
                description=payload.description,
                input_format=payload.input_format,
                output_format=payload.output_format,
                constraints=payload.constraints,
                examples=[ProblemExample(**e.model_dump()) for e in payload.examples],
                difficulty=payload.difficulty,
                topic=payload.topic,
                language=payload.language,
                marks=payload.marks,
            )
        )

    async def update_problem(self, problem_id: str, payload: ProblemUpdate) -> Problem:
        update = payload.model_dump(by_alias=True, exclude_unset=True)
        if not update:
            problem = await self.problem_repository.find_by_id(problem_id)
            if problem is None:
                raise ProblemNotFoundError("Problem not found")
            return problem

        updated = await self.problem_repository.update_one(problem_id, update)
        if updated is None:
            raise ProblemNotFoundError("Problem not found")
        return updated

    async def delete_problem(self, problem_id: str) -> None:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        test_cases = await self.test_case_repository.find_many({"problemId": problem_id}, limit=1000)
        for case in test_cases:
            if case.id is not None:
                await self.test_case_repository.delete_one(case.id)

        await self.problem_repository.delete_one(problem_id)

    async def create_test_case(self, problem_id: str, payload: TestCaseCreate) -> TestCase:
        problem = await self.problem_repository.find_by_id(problem_id)
        if problem is None:
            raise ProblemNotFoundError("Problem not found")

        return await self.test_case_repository.insert_one(
            TestCase(
                problem_id=problem_id,
                input=payload.input,
                expected_output=payload.expected_output,
                visibility=payload.visibility,
            )
        )

    async def update_test_case(self, test_case_id: str, payload: TestCaseUpdate) -> TestCase:
        update = payload.model_dump(by_alias=True, exclude_unset=True)
        if not update:
            test_case = await self.test_case_repository.find_by_id(test_case_id)
            if test_case is None:
                raise TestCaseNotFoundError("Test case not found")
            return test_case

        updated = await self.test_case_repository.update_one(test_case_id, update)
        if updated is None:
            raise TestCaseNotFoundError("Test case not found")
        return updated

    async def delete_test_case(self, test_case_id: str) -> None:
        test_case = await self.test_case_repository.find_by_id(test_case_id)
        if test_case is None:
            raise TestCaseNotFoundError("Test case not found")
        await self.test_case_repository.delete_one(test_case_id)

    # -- helpers -----------------------------------------------------------

    @staticmethod
    def _to_public(problem: Problem, public_test_cases: list[TestCase]) -> ProblemPublic:
        return ProblemPublic(
            id=problem.id,
            title=problem.title,
            slug=problem.slug,
            description=problem.description,
            input_format=problem.input_format,
            output_format=problem.output_format,
            constraints=problem.constraints,
            examples=problem.examples,
            difficulty=problem.difficulty,
            topic=problem.topic,
            language=problem.language,
            marks=problem.marks,
            public_test_cases=[
                TestCasePublic(input=c.input, expected_output=c.expected_output) for c in public_test_cases
            ],
        )

    @staticmethod
    def _to_admin_test_case(test_case: TestCase) -> TestCaseAdminView:
        return TestCaseAdminView(
            id=test_case.id,
            problem_id=test_case.problem_id,
            input=test_case.input,
            expected_output=test_case.expected_output,
            visibility=test_case.visibility,
        )
