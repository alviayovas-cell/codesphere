"""Real-Judge0 concurrency check for contest-day sizing.

load_test.py (the Phase 14 script) stubs SyncJudgeService.execute out
entirely, so it never actually exercises Judge0 - it's a test of this app's
own overhead, not of whether the self-hosted Judge0 instance you're about to
run the contest on can keep up. This script is the complement: it skips the
FastAPI app/RQ queue entirely and hits a running Judge0 instance's REST API
directly, with the same concurrency shape the app itself produces under a
worst-case simultaneous burst (e.g. every student auto-submitting at once
when a round's timer hits zero) - see submit_code_job/run_code_job in
app/workers/jobs.py: each in-flight submission fans out to up to 8 parallel
Judge0 calls (one per test case) via a ThreadPoolExecutor.

This is what DEPLOY_LAN_WINDOWS.md step 9 means by "load-test this exact
deployment (not the mocked local load_test.py run earlier)" - point it at
your real Judge0 instance and matching student count before the event.

Usage (from backend/, with the venv activated - only needs httpx, already
in requirements.txt):

    python scripts/load_test_judge0.py
    python scripts/load_test_judge0.py --students 40 --url http://192.168.1.50:2358
    python scripts/load_test_judge0.py --cases-per-submission 4

Reads JUDGE0_API_URL from the environment as a default if --url isn't
passed, matching the app's own config (app/core/config.py).
"""
import argparse
import asyncio
import base64
import os
import statistics
import sys
import time

import httpx

# Judge0's /about response includes non-ASCII characters (e.g. the
# maintainer's name), which crashes a plain print() on a Windows console
# using a legacy codepage that can't encode them. Force UTF-8 stdout so this
# script works out of the box on Windows without the user needing to fiddle
# with PYTHONIOENCODING or chcp themselves.
if sys.stdout.encoding is not None and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# int a, b; sum them. Not a placeholder no-op program - a real compile +
# stdin read + stdout write, matching what actual C submissions do, so
# compile time and isolate overhead show up in the numbers same as contest day.
SOURCE = "#include <stdio.h>\nint main(){int a,b;scanf(\"%d %d\",&a,&b);printf(\"%d\",a+b);return 0;}"
STDIN = "1 2"
EXPECTED_OUTPUT = "3"


def _b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


class Stats:
    def __init__(self):
        self.latencies: list[float] = []
        self.failures: list[str] = []
        self.wrong_verdict = 0
        self.lock = asyncio.Lock()

    async def record(self, elapsed: float, ok: bool, detail: str = "") -> None:
        async with self.lock:
            if ok:
                self.latencies.append(elapsed)
            else:
                self.failures.append(detail)

    def report(self, wall_elapsed: float, total_expected: int) -> None:
        n = len(self.latencies)
        print(f"\n{'=' * 70}")
        print(f"{total_expected} test-case submissions, wall-clock: {wall_elapsed:.2f}s")
        if n:
            ms = sorted(v * 1000 for v in self.latencies)
            p50 = ms[len(ms) // 2]
            p95 = ms[int(len(ms) * 0.95) - 1] if n > 1 else ms[0]
            print(f"Completed: {n}/{total_expected}")
            print(f"Latency (ms)  avg={statistics.mean(ms):.0f}  p50={p50:.0f}  p95={p95:.0f}  max={ms[-1]:.0f}")
        if self.wrong_verdict:
            print(f"Unexpected verdict (not a capacity problem, worth a look): {self.wrong_verdict}")
        print(f"Failed/rejected: {len(self.failures)}")
        for f in self.failures[:15]:
            print(f"  - {f}")
        if len(self.failures) > 15:
            print(f"  ... and {len(self.failures) - 15} more")

        if self.failures:
            print(
                "\nFailures usually mean the queue filled (MAX_QUEUE_SIZE) or a request "
                "timed out waiting for a free worker - raise COUNT/MAX_QUEUE_SIZE in "
                "judge0-selfhosted/judge0.conf, or lower --students/--cases-per-submission "
                "to match what the box can actually do, then re-run."
            )
        elif n:
            print("\nNo failures - this instance held up at this concurrency level.")


async def _submit_one(client: httpx.AsyncClient, url: str, language_id: int, stats: Stats) -> None:
    payload = {
        "source_code": _b64(SOURCE),
        "language_id": language_id,
        "stdin": _b64(STDIN),
        "expected_output": _b64(EXPECTED_OUTPUT),
    }
    start = time.perf_counter()
    try:
        response = await client.post(
            f"{url}/submissions",
            params={"base64_encoded": "true", "wait": "true"},
            json=payload,
            timeout=60.0,
        )
        elapsed = time.perf_counter() - start
        response.raise_for_status()
        data = response.json()
        status_id = (data.get("status") or {}).get("id")
        await stats.record(elapsed, ok=True)
        if status_id != 3:  # 3 == Accepted
            async with stats.lock:
                stats.wrong_verdict += 1
    except Exception as exc:  # noqa: BLE001 - any failure here is a capacity signal, not a bug to isolate
        elapsed = time.perf_counter() - start
        await stats.record(elapsed, ok=False, detail=f"{type(exc).__name__}: {exc}")


async def _submission_burst(client: httpx.AsyncClient, url: str, language_id: int, cases: int, stats: Stats) -> None:
    """One student's Submit: `cases` test cases hitting Judge0 concurrently,
    the same shape as submit_code_job's ThreadPoolExecutor(max_workers=8)."""
    await asyncio.gather(*[_submit_one(client, url, language_id, stats) for _ in range(cases)])


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--students", "-n", type=int, default=30, help="Concurrent students submitting at once (default: 30)")
    parser.add_argument("--cases-per-submission", type=int, default=8, help="Test cases per submission, fired concurrently (default: 8, matches jobs.py's thread pool cap)")
    parser.add_argument("--language-id", type=int, default=50, help="Judge0 language_id (default: 50, C GCC 9.2.0 - matches config.py's judge0_c_language_id default)")
    parser.add_argument("--url", default=os.environ.get("JUDGE0_API_URL", "http://localhost:2358"), help="Judge0 base URL (default: $JUDGE0_API_URL or http://localhost:2358)")
    args = parser.parse_args()

    url = args.url.rstrip("/")
    total_requests = args.students * args.cases_per_submission

    print(f"Target: {url}")
    try:
        async with httpx.AsyncClient() as probe:
            about = await probe.get(f"{url}/about", timeout=10.0)
            about.raise_for_status()
            print(f"Judge0 reachable: {about.json()}")
    except Exception as exc:  # noqa: BLE001
        print(f"\nCan't reach Judge0 at {url}/about ({type(exc).__name__}: {exc}).")
        print("Start it first (see DEPLOY_LAN_WINDOWS.md step 4: `docker compose up -d` from judge0-selfhosted/).")
        return

    print(
        f"Simulating {args.students} students submitting at the exact same instant, "
        f"{args.cases_per_submission} test cases each ({total_requests} total Judge0 calls)...\n"
    )

    stats = Stats()
    limits = httpx.Limits(max_connections=total_requests + 10, max_keepalive_connections=total_requests + 10)
    async with httpx.AsyncClient(limits=limits) as client:
        wall_start = time.perf_counter()
        await asyncio.gather(*[
            _submission_burst(client, url, args.language_id, args.cases_per_submission, stats)
            for _ in range(args.students)
        ])
        wall_elapsed = time.perf_counter() - wall_start

    stats.report(wall_elapsed, total_requests)


if __name__ == "__main__":
    asyncio.run(main())
