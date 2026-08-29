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


if __name__ == "__main__":
    main()
