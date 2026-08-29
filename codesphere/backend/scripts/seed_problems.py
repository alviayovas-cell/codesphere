"""Seed the initial Data Structures problem bank (spec section 8).

Creates the 10 named DS01-DS10 problems, each with 2 public and 5
hidden test cases. Idempotent: skips any problem whose slug already
exists, so it's safe to re-run.

Usage (run from backend/, with the venv activated):

    python scripts/seed_problems.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.mongodb import close_mongo_connection, connect_to_mongo, get_database  # noqa: E402
from app.database.repositories.problem_repository import (  # noqa: E402
    ProblemRepository,
    TestCaseRepository,
)
from app.models.common import Difficulty, TestCaseVisibility  # noqa: E402
from app.models.problem import Problem, ProblemExample, TestCase  # noqa: E402

# Each entry: slug, title, topic, difficulty, marks, description, input_format,
# output_format, constraints, examples, public_cases, hidden_cases.
# public_cases / hidden_cases are lists of (input, expected_output) tuples.

PROBLEMS = [
    dict(
        slug="reverse-an-array",
        title="DS01 - Reverse an Array",
        topic="Arrays",
        difficulty=Difficulty.EASY,
        marks=10,
        description=(
            "Given an array of N integers, reverse the array in place and print the "
            "reversed array."
        ),
        input_format="The first line contains an integer N. The second line contains N "
        "space-separated integers.",
        output_format="Print N space-separated integers: the array in reversed order.",
        constraints="1 <= N <= 1000\n-10^6 <= arr[i] <= 10^6",
        examples=[
            ProblemExample(input="5\n1 2 3 4 5", output="5 4 3 2 1"),
        ],
        public_cases=[
            ("5\n1 2 3 4 5", "5 4 3 2 1"),
            ("3\n10 20 30", "30 20 10"),
        ],
        hidden_cases=[
            ("1\n7", "7"),
            ("4\n-1 -2 -3 -4", "-4 -3 -2 -1"),
            ("6\n1 1 2 2 3 3", "3 3 2 2 1 1"),
            ("2\n100 -100", "-100 100"),
            ("7\n5 4 3 2 1 0 -1", "-1 0 1 2 3 4 5"),
        ],
    ),
    dict(
        slug="second-largest-element",
        title="DS02 - Find the Second Largest Element",
        topic="Arrays",
        difficulty=Difficulty.EASY,
        marks=10,
        description=(
            "Given an array of N distinct integers, find and print the second largest "
            "element in the array."
        ),
        input_format="The first line contains an integer N. The second line contains N "
        "space-separated distinct integers.",
        output_format="Print a single integer: the second largest element.",
        constraints="2 <= N <= 1000\nAll elements are distinct.\n-10^6 <= arr[i] <= 10^6",
        examples=[
            ProblemExample(input="5\n12 35 1 10 34", output="34"),
        ],
        public_cases=[
            ("5\n12 35 1 10 34", "34"),
            ("4\n1 2 3 4", "3"),
        ],
        hidden_cases=[
            ("2\n5 10", "5"),
            ("2\n10 5", "5"),
            ("6\n100 90 80 70 60 50", "90"),
            ("3\n-5 -1 -10", "-5"),
            ("5\n0 -1 -2 -3 5", "0"),
        ],
    ),
    dict(
        slug="check-balanced-parentheses",
        title="DS03 - Check Balanced Parentheses",
        topic="Stack",
        difficulty=Difficulty.MEDIUM,
        marks=15,
        description=(
            "Given a string containing only the bracket characters ( ) { } [ ], "
            "determine whether the brackets are balanced: every opening bracket must "
            "be closed by the same type of bracket, and brackets must close in the "
            "correct order."
        ),
        input_format="A single line containing the string S, made up only of the "
        "characters ( ) { } [ ].",
        output_format='Print "YES" if the string is balanced, otherwise print "NO".',
        constraints="1 <= |S| <= 1000",
        examples=[
            ProblemExample(input="{[()]}", output="YES"),
            ProblemExample(input="{[(])}", output="NO"),
        ],
        public_cases=[
            ("{[()]}", "YES"),
            ("([)]", "NO"),
        ],
        hidden_cases=[
            ("()", "YES"),
            ("(()", "NO"),
            ("[[[]]]", "YES"),
            ("{}[]()", "YES"),
            ("((()))]", "NO"),
        ],
    ),
    dict(
        slug="implement-stack-using-array",
        title="DS04 - Implement Stack Using Array",
        topic="Stack",
        difficulty=Difficulty.MEDIUM,
        marks=15,
        description=(
            "Implement a stack of maximum size N using an array, supporting PUSH x and "
            "POP operations. Process Q operations in the order given. For 'PUSH x', "
            "push x onto the stack; if the stack is already full, print 'Stack "
            "Overflow' instead and do not push. For 'POP', remove and print the top "
            "element; if the stack is empty, print 'Stack Underflow' instead."
        ),
        input_format="The first line contains two integers N and Q, separated by a "
        "space. Each of the next Q lines contains either 'PUSH x' or 'POP'.",
        output_format="For each operation that produces output (a successful POP, a "
        "failed POP, or a failed PUSH), print one line as described above.",
        constraints="1 <= N <= 1000\n1 <= Q <= 1000",
        examples=[
            ProblemExample(
                input="3 5\nPUSH 1\nPUSH 2\nPOP\nPUSH 3\nPOP", output="2\n3"
            ),
        ],
        public_cases=[
            ("3 5\nPUSH 1\nPUSH 2\nPOP\nPUSH 3\nPOP", "2\n3"),
            ("2 4\nPUSH 5\nPUSH 6\nPUSH 7\nPOP", "Stack Overflow\n6"),
        ],
        hidden_cases=[
            ("1 2\nPOP\nPUSH 9", "Stack Underflow"),
            ("5 3\nPUSH 1\nPUSH 2\nPUSH 3", ""),
            ("2 6\nPUSH 1\nPOP\nPOP\nPUSH 2\nPUSH 3\nPOP", "1\nStack Underflow\n3"),
            ("1 3\nPUSH 100\nPUSH 200\nPOP", "Stack Overflow\n100"),
            ("4 4\nPUSH -1\nPUSH -2\nPOP\nPOP", "-2\n-1"),
        ],
    ),
    dict(
        slug="implement-queue-using-array",
        title="DS05 - Implement Queue Using Array",
        topic="Queue",
        difficulty=Difficulty.MEDIUM,
        marks=15,
        description=(
            "Implement a queue of maximum size N using an array, supporting ENQUEUE x "
            "and DEQUEUE operations. Process Q operations in the order given. For "
            "'ENQUEUE x', add x to the rear of the queue; if the queue is full, print "
            "'Queue Overflow' instead. For 'DEQUEUE', remove and print the front "
            "element; if the queue is empty, print 'Queue Underflow' instead."
        ),
        input_format="The first line contains two integers N and Q, separated by a "
        "space. Each of the next Q lines contains either 'ENQUEUE x' or 'DEQUEUE'.",
        output_format="For each operation that produces output (a successful DEQUEUE, "
        "a failed DEQUEUE, or a failed ENQUEUE), print one line as described above.",
        constraints="1 <= N <= 1000\n1 <= Q <= 1000",
        examples=[
            ProblemExample(
                input="3 5\nENQUEUE 1\nENQUEUE 2\nDEQUEUE\nENQUEUE 3\nDEQUEUE",
                output="1\n2",
            ),
        ],
        public_cases=[
            ("3 5\nENQUEUE 1\nENQUEUE 2\nDEQUEUE\nENQUEUE 3\nDEQUEUE", "1\n2"),
            ("2 4\nENQUEUE 5\nENQUEUE 6\nENQUEUE 7\nDEQUEUE", "Queue Overflow\n5"),
        ],
        hidden_cases=[
            ("1 2\nDEQUEUE\nENQUEUE 9", "Queue Underflow"),
            ("5 3\nENQUEUE 1\nENQUEUE 2\nENQUEUE 3", ""),
            (
                "2 6\nENQUEUE 1\nDEQUEUE\nDEQUEUE\nENQUEUE 2\nENQUEUE 3\nDEQUEUE",
                "1\nQueue Underflow\n2",
            ),
            ("1 3\nENQUEUE 100\nENQUEUE 200\nDEQUEUE", "Queue Overflow\n100"),
            ("4 4\nENQUEUE -1\nENQUEUE -2\nDEQUEUE\nDEQUEUE", "-1\n-2"),
        ],
    ),
    dict(
        slug="find-middle-of-linked-list",
        title="DS06 - Find Middle Element of Linked List",
        topic="Linked List",
        difficulty=Difficulty.MEDIUM,
        marks=15,
        description=(
            "Given the elements of a singly linked list in order, find and print the "
            "value of the middle node. If the list has an even number of nodes (two "
            "middle nodes), print the value of the second middle node."
        ),
        input_format="The first line contains an integer N, the number of nodes. The "
        "second line contains N space-separated integers, the node values in order.",
        output_format="Print a single integer: the value of the middle node.",
        constraints="1 <= N <= 1000",
        examples=[
            ProblemExample(input="5\n1 2 3 4 5", output="3"),
            ProblemExample(input="6\n1 2 3 4 5 6", output="4"),
        ],
        public_cases=[
            ("5\n1 2 3 4 5", "3"),
            ("6\n1 2 3 4 5 6", "4"),
        ],
        hidden_cases=[
            ("1\n42", "42"),
            ("2\n10 20", "20"),
            ("7\n1 1 1 1 1 1 1", "1"),
            ("4\n-1 -2 -3 -4", "-3"),
            ("3\n5 10 15", "10"),
        ],
    ),
    dict(
        slug="reverse-a-linked-list",
        title="DS07 - Reverse a Linked List",
        topic="Linked List",
        difficulty=Difficulty.MEDIUM,
        marks=15,
        description=(
            "Given the elements of a singly linked list in order, reverse the list and "
            "print its values in the reversed order."
        ),
        input_format="The first line contains an integer N. The second line contains N "
        "space-separated integers, the node values in order.",
        output_format="Print N space-separated integers: the node values in reversed "
        "order.",
        constraints="1 <= N <= 1000",
        examples=[
            ProblemExample(input="5\n1 2 3 4 5", output="5 4 3 2 1"),
        ],
        public_cases=[
            ("5\n1 2 3 4 5", "5 4 3 2 1"),
            ("3\n10 20 30", "30 20 10"),
        ],
        hidden_cases=[
            ("1\n7", "7"),
            ("2\n1 2", "2 1"),
            ("6\n1 1 2 2 3 3", "3 3 2 2 1 1"),
            ("4\n-1 -2 -3 -4", "-4 -3 -2 -1"),
            ("7\n0 1 2 3 4 5 6", "6 5 4 3 2 1 0"),
        ],
    ),
    dict(
        slug="binary-search-sorted-array",
        title="DS08 - Binary Search in Sorted Array",
        topic="Searching",
        difficulty=Difficulty.EASY,
        marks=10,
        description=(
            "Given an array of N distinct integers sorted in ascending order and a "
            "target value X, use binary search to find the 0-based index of X in the "
            "array. If X is not present, print -1."
        ),
        input_format="The first line contains an integer N. The second line contains N "
        "space-separated integers sorted in ascending order. The third line contains "
        "the integer X.",
        output_format="Print a single integer: the 0-based index of X, or -1 if X is "
        "not present.",
        constraints="1 <= N <= 10000\nThe array is sorted in ascending order with "
        "distinct elements.",
        examples=[
            ProblemExample(input="5\n1 3 5 7 9\n7", output="3"),
        ],
        public_cases=[
            ("5\n1 3 5 7 9\n7", "3"),
            ("5\n1 3 5 7 9\n4", "-1"),
        ],
        hidden_cases=[
            ("1\n10\n10", "0"),
            ("1\n10\n5", "-1"),
            ("6\n-10 -5 0 5 10 15\n-10", "0"),
            ("6\n-10 -5 0 5 10 15\n15", "5"),
            ("4\n2 4 6 8\n5", "-1"),
        ],
    ),
    dict(
        slug="detect-cycle-in-linked-list",
        title="DS09 - Detect a Cycle in Linked List",
        topic="Linked List",
        difficulty=Difficulty.HARD,
        marks=20,
        description=(
            "You are given N node values for a singly linked list, and an integer pos "
            "giving the 0-based index of the node that the last node's next pointer "
            "connects to (forming a cycle). If pos is -1, the list has no cycle. "
            'Print "YES" if the list has a cycle, otherwise print "NO".'
        ),
        input_format="The first line contains an integer N, the number of nodes. The "
        "second line contains N space-separated integers, the node values in order. "
        "The third line contains the integer pos.",
        output_format='Print "YES" if the linked list has a cycle, otherwise print '
        '"NO".',
        constraints="1 <= N <= 10000\n-1 <= pos < N",
        examples=[
            ProblemExample(input="4\n3 2 0 -4\n1", output="YES"),
            ProblemExample(input="2\n1 2\n-1", output="NO"),
        ],
        public_cases=[
            ("4\n3 2 0 -4\n1", "YES"),
            ("2\n1 2\n-1", "NO"),
        ],
        hidden_cases=[
            ("1\n1\n0", "YES"),
            ("1\n1\n-1", "NO"),
            ("3\n1 2 3\n0", "YES"),
            ("5\n1 2 3 4 5\n-1", "NO"),
            ("6\n1 2 3 4 5 6\n4", "YES"),
        ],
    ),
    dict(
        slug="find-maximum-in-stack",
        title="DS10 - Find Maximum Element in a Stack",
        topic="Stack",
        difficulty=Difficulty.EASY,
        marks=10,
        description=(
            "Design a stack, initially empty, that supports PUSH x, POP, and GET_MAX "
            "operations. Process Q operations in the order given. For 'PUSH x', push x "
            "onto the stack. For 'POP', remove and print the top element, or print "
            "'Stack Underflow' if the stack is empty. For 'GET_MAX', print the current "
            "maximum element in the stack, or print 'Stack Empty' if the stack is "
            "empty."
        ),
        input_format="The first line contains an integer Q. Each of the next Q lines "
        "contains 'PUSH x', 'POP', or 'GET_MAX'.",
        output_format="For each POP or GET_MAX operation, print the result on its own "
        "line as described above.",
        constraints="1 <= Q <= 1000",
        examples=[
            ProblemExample(
                input="6\nPUSH 3\nPUSH 5\nGET_MAX\nPOP\nGET_MAX\nPOP",
                output="5\n5\n3\n3",
            ),
        ],
        public_cases=[
            ("6\nPUSH 3\nPUSH 5\nGET_MAX\nPOP\nGET_MAX\nPOP", "5\n5\n3\n3"),
            ("3\nGET_MAX\nPUSH 1\nGET_MAX", "Stack Empty\n1"),
        ],
        hidden_cases=[
            ("2\nPOP\nGET_MAX", "Stack Underflow\nStack Empty"),
            ("5\nPUSH 1\nPUSH 2\nPUSH 1\nGET_MAX\nPOP", "2\n1"),
            ("5\nPUSH -5\nPUSH -1\nPUSH -10\nGET_MAX\nPOP", "-1\n-10"),
            ("4\nPUSH 7\nPOP\nPOP\nGET_MAX", "7\nStack Underflow\nStack Empty"),
            (
                "7\nPUSH 2\nPUSH 2\nGET_MAX\nPOP\nGET_MAX\nPOP\nGET_MAX",
                "2\n2\n2\n2\nStack Empty",
            ),
        ],
    ),
]


async def seed() -> None:
    await connect_to_mongo()
    try:
        problem_repository = ProblemRepository(get_database())
        test_case_repository = TestCaseRepository(get_database())

        for entry in PROBLEMS:
            existing = await problem_repository.find_one({"slug": entry["slug"]})
            if existing is not None:
                print(f"Skipping '{entry['title']}' - problem already exists.")
                continue

            problem = await problem_repository.insert_one(
                Problem(
                    title=entry["title"],
                    slug=entry["slug"],
                    description=entry["description"],
                    input_format=entry["input_format"],
                    output_format=entry["output_format"],
                    constraints=entry["constraints"],
                    examples=entry["examples"],
                    difficulty=entry["difficulty"],
                    topic=entry["topic"],
                    language="C",
                    marks=entry["marks"],
                )
            )

            for test_input, expected_output in entry["public_cases"]:
                await test_case_repository.insert_one(
                    TestCase(
                        problem_id=problem.id,
                        input=test_input,
                        expected_output=expected_output,
                        visibility=TestCaseVisibility.PUBLIC,
                    )
                )
            for test_input, expected_output in entry["hidden_cases"]:
                await test_case_repository.insert_one(
                    TestCase(
                        problem_id=problem.id,
                        input=test_input,
                        expected_output=expected_output,
                        visibility=TestCaseVisibility.HIDDEN,
                    )
                )

            total_cases = len(entry["public_cases"]) + len(entry["hidden_cases"])
            print(f"Created '{entry['title']}' (id={problem.id}) with {total_cases} test cases.")

        print("Done.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed())
