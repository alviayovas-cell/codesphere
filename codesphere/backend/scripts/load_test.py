"""Phase 14 load test: ~60 concurrent students exercising the full student
flow (login, browse learning, practice run/submit, start a coding round,
autosave, round-scoped submit, finish, check results/leaderboard) against
the real FastAPI app, via httpx's in-process ASGI transport - no real
socket/uvicorn needed, but still the real app: real dependency injection,
real rate limiter, a real RQ worker pool draining a real (fake) Redis queue.

Judge0 is stubbed (SyncJudgeService.execute) so this doesn't hammer the
shared public demo instance with 60 concurrent requests, and so timing
reflects this app's own overhead rather than a third-party rate limiter.

Requires dev-only packages not in requirements.txt (same pattern as this
project's other one-off integration-check scripts):

    pip install mongomock-motor mongomock fakeredis

Usage (run from backend/, with the venv activated):

    python scripts/load_test.py [label]

`label` is just a string included in the printed report header (e.g.
"baseline" / "after-fix") - useful when comparing two runs across a code
change, which is how this was actually used during Phase 14.
"""
import asyncio
import random
import statistics
import sys
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import fakeredis  # noqa: E402
import mongomock  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

N_STUDENTS = 60

# --- Judge0 stub: fast, jittered, randomized-but-plausible verdicts --------
import app.services.judge_service as judge_service_module  # noqa: E402
from app.models.common import Verdict  # noqa: E402


def _stub_execute(self, source_code, stdin="", expected_output=None, max_retries=2):
    time.sleep(random.uniform(0.03, 0.15))  # simulated compile+run latency
    verdict = random.choices(
        [Verdict.ACCEPTED, Verdict.WRONG_ANSWER, Verdict.RUNTIME_ERROR],
        weights=[0.7, 0.2, 0.1],
    )[0]
    return judge_service_module.ExecutionResult(
        verdict=verdict, stdout=expected_output or "", stderr="", compile_output="",
        status_description=verdict.value, time_seconds=0.05, memory_kb=1024,
    )


judge_service_module.SyncJudgeService.execute = _stub_execute

# --- Redis: fake, shared between the app and a background worker thread ----
import app.workers.queue_config as queue_config_module  # noqa: E402

fake_redis = fakeredis.FakeStrictRedis()
queue_config_module.get_redis_connection = lambda: fake_redis

# --- Query counting instrumentation (BaseRepository-level) -----------------
import app.database.repositories.base_repository as base_repo_module  # noqa: E402

_query_count = {"n": 0}
_ORIG_METHODS = {
    name: getattr(base_repo_module.BaseRepository, name)
    for name in ("find_by_id", "find_by_ids", "find_one", "find_many", "insert_one", "update_one", "delete_one", "upsert_one")
}


def _counted(fn):
    async def wrapper(*args, **kwargs):
        _query_count["n"] += 1
        return await fn(*args, **kwargs)

    return wrapper


@contextmanager
def count_queries():
    for name, fn in _ORIG_METHODS.items():
        setattr(base_repo_module.BaseRepository, name, _counted(fn))
    _query_count["n"] = 0
    try:
        yield _query_count
    finally:
        for name, fn in _ORIG_METHODS.items():
            setattr(base_repo_module.BaseRepository, name, fn)


# --- Mongo: in-memory async store (app) + mirrored sync store (worker) -----
from app.database import mongodb as mongodb_module  # noqa: E402
import app.workers.jobs as jobs_module  # noqa: E402
import app.core.config as config_module  # noqa: E402

STUDENTS = []  # filled during seeding: list of (email, password, id)


async def _seed():
    client = AsyncMongoMockClient(tz_aware=True)
    mongodb_module.mongodb.client = client
    mongodb_module.mongodb.database = client["codesphere_load_test"]
    await mongodb_module.create_indexes()

    from app.core.security import hash_password
    from app.database.repositories.user_repository import UserRepository
    from app.database.repositories.problem_repository import ProblemRepository, TestCaseRepository
    from app.database.repositories.coding_round_repository import CodingRoundRepository
    from app.models.common import UserRole, RoundStatus, Difficulty, TestCaseVisibility
    from app.models.user import User
    from app.models.problem import Problem, ProblemExample, TestCase
    from app.models.coding_round import CodingRound, QuestionPoolConfiguration

    user_repo = UserRepository(mongodb_module.get_database())
    await user_repo.insert_one(User(
        name="Admin", email="admin@loadtest.example.com", password_hash=hash_password("AdminPass123"),
        register_number="ADMIN001", student_class="ADMIN", role=UserRole.ADMIN, must_change_password=False,
    ))
    for i in range(N_STUDENTS):
        email = f"student{i}@loadtest.example.com"
        password = "StudentPass123"
        created = await user_repo.insert_one(User(
            name=f"Load Student {i}", email=email, password_hash=hash_password(password),
            register_number=f"LS{i:03d}", student_class="CSE-A", role=UserRole.STUDENT, must_change_password=False,
        ))
        STUDENTS.append((email, password, created.id))

    problem_repo = ProblemRepository(mongodb_module.get_database())
    test_case_repo = TestCaseRepository(mongodb_module.get_database())
    problems = []
    for i, difficulty in enumerate([Difficulty.EASY] * 3 + [Difficulty.MEDIUM] * 3 + [Difficulty.HARD] * 3):
        p = await problem_repo.insert_one(Problem(
            title=f"Load Problem {i}", slug=f"load-problem-{i}", description="Add two numbers.",
            input_format="Two ints", output_format="Their sum", constraints="",
            examples=[ProblemExample(input="1 2", output="3", explanation=None)],
            difficulty=difficulty, topic="Math", marks=10,
        ))
        await test_case_repo.insert_one(TestCase(problem_id=p.id, input="1 2", expected_output="3", visibility=TestCaseVisibility.PUBLIC))
        problems.append(p)

    round_repo = CodingRoundRepository(mongodb_module.get_database())
    now = datetime.now(timezone.utc)
    coding_round = await round_repo.insert_one(CodingRound(
        title="Load Test Round", description="d", duration_minutes=60,
        start_time=now - timedelta(minutes=5), end_time=now + timedelta(hours=2),
        status=RoundStatus.SCHEDULED, problem_ids=[p.id for p in problems],
        question_pool_configuration=QuestionPoolConfiguration(easy_questions=1, medium_questions=1, hard_questions=1, randomize_order=True),
    ))

    # Mirror into the sync store the worker thread's jobs.py reads from.
    jobs_module._client = mongomock.MongoClient(tz_aware=True)
    sync_db = jobs_module._client[config_module.settings.mongodb_db_name]
    for p in problems:
        sync_db.problems.insert_one({"_id": mongomock.ObjectId(p.id), "title": p.title, "marks": p.marks})
        sync_db.test_cases.insert_one({"problemId": p.id, "input": "1 2", "expectedOutput": "3", "visibility": "public"})
    round_doc = await mongodb_module.get_database()["coding_rounds"].find_one({})
    sync_db.coding_rounds.insert_one(round_doc)

    from rq.worker import SimpleWorker
    SimpleWorker._install_signal_handlers = lambda self: None

    def _run_worker():
        SimpleWorker(queue_config_module.QUEUE_NAMES_BY_PRIORITY, connection=fake_redis).work(with_scheduler=False)

    for _ in range(3):  # a few worker threads, like several `run_worker.py` processes
        threading.Thread(target=_run_worker, daemon=True).start()

    return coding_round.id


class Stats:
    def __init__(self):
        self.timings: dict[str, list[float]] = {}
        self.errors: list[str] = []
        self.lock = threading.Lock()

    def record(self, category, seconds, ok, detail=""):
        with self.lock:
            self.timings.setdefault(category, []).append(seconds)
            if not ok:
                self.errors.append(f"{category}: {detail}")

    def report(self):
        print(f"\n{'ENDPOINT':<24} {'N':>5} {'AVG ms':>8} {'P50 ms':>8} {'P95 ms':>8} {'MAX ms':>8}")
        for category, values in sorted(self.timings.items()):
            ms = sorted(v * 1000 for v in values)
            p50 = ms[len(ms) // 2]
            p95 = ms[int(len(ms) * 0.95) - 1] if len(ms) > 1 else ms[0]
            print(f"{category:<24} {len(ms):>5} {statistics.mean(ms):>8.1f} {p50:>8.1f} {p95:>8.1f} {ms[-1]:>8.1f}")
        print(f"\nTotal errors: {len(self.errors)}")
        for e in self.errors[:15]:
            print(f"  - {e}")


async def timed(stats: Stats, category: str, coro):
    start = time.perf_counter()
    try:
        response = await coro
        ok = response.status_code < 400
        stats.record(category, time.perf_counter() - start, ok, f"HTTP {response.status_code}: {response.text[:120]}")
        return response
    except Exception as exc:  # noqa: BLE001
        stats.record(category, time.perf_counter() - start, False, repr(exc))
        return None


async def poll_job(client, headers, job_id, stats, timeout=10):
    deadline = time.perf_counter() + timeout
    while time.perf_counter() < deadline:
        r = await timed(stats, "poll_job", client.get(f"/api/code/jobs/{job_id}", headers=headers))
        if r is not None and r.json().get("status") in ("completed", "failed"):
            return r.json()
        await asyncio.sleep(0.1)
    return None


async def student_flow(client: AsyncClient, email: str, password: str, round_id: str, stats: Stats):
    r = await timed(stats, "login", client.post("/api/auth/login", json={"email": email, "password": password}))
    if r is None or r.status_code >= 400:
        return
    token = r.json().get("access_token") or r.json().get("accessToken")
    headers = {"Authorization": f"Bearer {token}"}

    await timed(stats, "get_me", client.get("/api/auth/me", headers=headers))
    await timed(stats, "learning_modules", client.get("/api/learning/modules", headers=headers))
    problems_resp = await timed(stats, "list_problems", client.get("/api/problems", headers=headers))
    problems = problems_resp.json() if problems_resp else []

    if problems:
        target = random.choice(problems)
        run_resp = await timed(
            stats, "run_code",
            client.post("/api/code/run", headers=headers, json={"problemId": target["id"], "code": "int main(){return 0;}", "stdin": "1 2"}),
        )
        if run_resp and run_resp.status_code < 400:
            await poll_job(client, headers, run_resp.json()["jobId"], stats)

    start_resp = await timed(stats, "start_round", client.post(f"/api/rounds/{round_id}/start", headers=headers))
    if start_resp is None or start_resp.status_code >= 400:
        return
    session = start_resp.json()

    for question in session["assignedQuestions"]:
        pid = question["problemId"]
        await timed(
            stats, "autosave",
            client.post(f"/api/rounds/{round_id}/autosave", headers=headers, json={"problemId": pid, "code": "int main(){return 0;}"}),
        )
        submit_resp = await timed(
            stats, "submit_code",
            client.post("/api/code/submit", headers=headers, json={"problemId": pid, "code": "int main(){return 0;}", "roundId": round_id}),
        )
        if submit_resp and submit_resp.status_code < 400:
            await poll_job(client, headers, submit_resp.json()["jobId"], stats)

    await timed(stats, "finish_round", client.post(f"/api/rounds/{round_id}/submit", headers=headers))
    await timed(stats, "get_results", client.get("/api/results", headers=headers))
    await timed(stats, "leaderboard", client.get(f"/api/rounds/{round_id}/leaderboard", headers=headers))


async def admin_dashboard_pass(client: AsyncClient, admin_headers, round_id: str, label: str):
    """Simulates an admin with the Monitoring/Results/Analytics pages open,
    measured with query counting so N+1 patterns show up as a number."""
    endpoints = [
        ("admin_sessions", f"/api/admin/rounds/{round_id}/sessions"),
        ("admin_results", f"/api/admin/rounds/{round_id}/results"),
        ("admin_leaderboard", f"/api/admin/rounds/{round_id}/leaderboard"),
        ("admin_analytics", "/api/admin/analytics"),
    ]
    print(f"\n--- Admin dashboard query counts ({label}, {N_STUDENTS} finished sessions) ---")
    for category, path in endpoints:
        with count_queries() as counter:
            start = time.perf_counter()
            r = await client.get(path, headers=admin_headers)
            elapsed = time.perf_counter() - start
        print(f"  {category:<20} {elapsed * 1000:>8.1f} ms   {counter['n']:>5} repository calls   (HTTP {r.status_code})")


async def main():
    round_id = await _seed()

    from app.main import app  # imported only now, after the redis patch above

    stats = Stats()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://loadtest") as client:
        wall_start = time.perf_counter()
        await asyncio.gather(*[
            student_flow(client, email, password, round_id, stats)
            for email, password, _id in STUDENTS
        ])
        wall_elapsed = time.perf_counter() - wall_start

        admin_login = await client.post("/api/auth/login", json={"email": "admin@loadtest.example.com", "password": "AdminPass123"})
        admin_token = admin_login.json().get("access_token") or admin_login.json().get("accessToken")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        await admin_dashboard_pass(client, admin_headers, round_id, label=sys.argv[1] if len(sys.argv) > 1 else "run")

    print(f"\n{'=' * 70}")
    print(f"{N_STUDENTS} concurrent students, full flow, wall-clock: {wall_elapsed:.2f}s")
    stats.report()


if __name__ == "__main__":
    asyncio.run(main())
