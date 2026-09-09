"""RQ worker entrypoint.

Listens to the three priority queues in order - Final Submit, then Auto
Submit, then Run Code - so higher-priority jobs always get picked up
first (spec section 12).

Usage (from backend/, with the venv activated):

    python -m app.workers.run_worker

Run more than one of these (in separate terminals, or via a process
manager) to process jobs concurrently under load.
"""

import logging
import sys
import threading

from rq.worker import SimpleWorker, Worker

from app.workers.queue_config import QUEUE_NAMES_BY_PRIORITY, get_redis_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    connection = get_redis_connection()
    connection.ping()  # fail fast with a clear error if Redis is unreachable
    logger.info("Connected to Redis. Listening to queues in priority order: %s", QUEUE_NAMES_BY_PRIORITY)

    # RQ's default Worker forks a child process per job (os.fork), which
    # does not exist on Windows. SimpleWorker runs each job in the worker's
    # own process instead - the standard, documented way to run RQ on
    # Windows (also fine on Linux/macOS, just without fork's isolation
    # between jobs).
    worker_class = SimpleWorker if sys.platform == "win32" else Worker
    worker = worker_class(QUEUE_NAMES_BY_PRIORITY, connection=connection)
    worker.work(with_scheduler=False)


def start_inline_worker_thread() -> threading.Thread:
    """Runs the RQ worker in a background thread of the *web* process,
    instead of as a separate process/service.

    This exists for free-tier deployments (e.g. Render's free plan only
    offers Web Services and Static Sites - a Background Worker requires a
    paid plan) where running a second, separate worker service isn't an
    option. Opt in via the RUN_WORKER_INLINE=true env var (see
    app/main.py's lifespan and render.yaml) - the standalone `main()`
    above and a real separate worker process/service remain the normal,
    recommended path once that's available; this is the fallback.

    Always uses SimpleWorker here, never the platform check main() does:
    RQ's default Worker forks a child process per job, and forking from a
    thread inside an already-running multi-threaded/async process (like
    this FastAPI app) is unsafe - locks held by other threads at fork
    time stay held forever in the child, which can deadlock. SimpleWorker
    runs jobs in-thread with no fork, which is the safe choice here
    regardless of OS.
    """
    connection = get_redis_connection()
    connection.ping()
    logger.info("Starting inline RQ worker thread (RUN_WORKER_INLINE=true). Queues: %s", QUEUE_NAMES_BY_PRIORITY)

    def _run() -> None:
        worker = SimpleWorker(QUEUE_NAMES_BY_PRIORITY, connection=connection)
        # RQ installs SIGINT/SIGTERM handlers by default, which only works
        # in the main thread of the main interpreter - this runs in a
        # background thread, so skip it. There's no CLI signal to catch
        # here anyway: this daemon thread just ends when the process does.
        worker._install_signal_handlers = lambda: None
        worker.work(with_scheduler=False)

    thread = threading.Thread(target=_run, name="inline-rq-worker", daemon=True)
    thread.start()
    return thread


if __name__ == "__main__":
    main()
