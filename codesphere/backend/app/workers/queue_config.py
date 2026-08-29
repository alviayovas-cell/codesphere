"""Redis connection and RQ queue setup.

Three queues implement the priority order from spec section 12:
Final Submit > Auto Submit > Run Code. An RQ worker started with
`Worker(QUEUE_NAMES_BY_PRIORITY, connection=...)` always drains a
higher-priority queue before looking at a lower-priority one, so a
burst of Run Code requests never delays someone's graded submission.

"Final Submit" here means any graded SubmissionType.SUBMIT job -
today that's practice-mode Submit Code (Phase 6/7); once coding rounds
exist (Phase 8) their final submissions use the same queue, since both
are the same priority tier. Auto Submit (Phase 10, when a round's timer
expires) gets its own queue one tier below, and Run Code is lowest.
"""

from redis import Redis
from rq import Queue

from app.core.config import settings

QUEUE_FINAL_SUBMIT = "final_submit"
QUEUE_AUTO_SUBMIT = "auto_submit"
QUEUE_RUN_CODE = "run_code"

# Highest priority first - this order is what worker processes should listen
# to (see run_worker.py).
QUEUE_NAMES_BY_PRIORITY = [QUEUE_FINAL_SUBMIT, QUEUE_AUTO_SUBMIT, QUEUE_RUN_CODE]


def get_redis_connection() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue(name: str, connection: Redis | None = None) -> Queue:
    return Queue(name, connection=connection or get_redis_connection())
