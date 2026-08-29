"""Seed the initial C Programming learning path (spec section 6).

Creates the 10 named modules, each with one topic covering that
subject. Idempotent: skips any module whose title already exists, so
it's safe to re-run.

The YouTube reference used here (freeCodeCamp's "C Programming
Tutorial for Beginners") is a verified, real, full-length course
covering all ten subjects below - it is meant as a working starting
point, not a precise per-topic citation. Replace it with more specific
per-topic links using the admin learning-management endpoints
(POST/PUT /api/admin/learning/modules and .../topics) once you have
ones you trust.

Usage (run from backend/, with the venv activated):

    python scripts/seed_learning_content.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.mongodb import close_mongo_connection, connect_to_mongo, get_database  # noqa: E402
from app.database.repositories.learning_repository import (  # noqa: E402
    LearningModuleRepository,
    LearningTopicRepository,
)
from app.models.learning import LearningModule, LearningTopic  # noqa: E402

GENERAL_VIDEO_URL = "https://www.youtube.com/watch?v=KJgsSFOSQv0"

MODULES = [
    (
        "Introduction to C",
        "What C is, why it's still widely taught, the structure of a minimal C program "
        "(#include, main, statements), and how to compile and run a C file with a C compiler "
        "such as gcc.",
    ),
    (
        "Variables and Data Types",
        "Declaring and initializing variables, the built-in types (int, float, double, char), "
        "type sizes, and format specifiers used with printf/scanf.",
    ),
    (
        "Operators",
        "Arithmetic, relational, logical, bitwise, and assignment operators, increment/decrement, "
        "and operator precedence and associativity.",
    ),
    (
        "Conditional Statements",
        "Branching with if, if-else, the else-if ladder, and the switch-case statement.",
    ),
    (
        "Loops",
        "Repetition with while, do-while, and for loops, plus break and continue and how to write "
        "nested loops.",
    ),
    (
        "Functions",
        "Declaring, defining, and calling functions, passing parameters, return values, and a first "
        "look at recursion.",
    ),
    (
        "Arrays",
        "Declaring and initializing one-dimensional and two-dimensional arrays, and traversing them "
        "with loops.",
    ),
    (
        "Pointers",
        "Pointer declaration, the address-of (&) and dereference (*) operators, pointer arithmetic, "
        "and the relationship between pointers and arrays.",
    ),
    (
        "Structures",
        "Declaring struct types, accessing members, nested structures, and arrays of structures.",
    ),
    (
        "Basic Data Structures",
        "A first look at stacks, queues, and linked lists in C - the bridge into the Data Structures "
        "problem set.",
    ),
]


async def seed() -> None:
    await connect_to_mongo()
    try:
        module_repository = LearningModuleRepository(get_database())
        topic_repository = LearningTopicRepository(get_database())

        for index, (title, description) in enumerate(MODULES, start=1):
            existing = await module_repository.find_one({"title": title})
            if existing is not None:
                print(f"Skipping '{title}' - module already exists.")
                continue

            module = await module_repository.insert_one(
                LearningModule(title=title, description=description, order=index, language="C")
            )
            await topic_repository.insert_one(
                LearningTopic(
                    module_id=module.id,
                    title=title,
                    description=description,
                    video_url=GENERAL_VIDEO_URL,
                    order=1,
                )
            )
            print(f"Created module '{title}' (id={module.id}) with one topic.")

        print("Done.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed())
