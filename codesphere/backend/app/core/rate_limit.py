import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class InMemoryRateLimiter:
    """A simple sliding-window rate limiter, keyed per caller.

    In-memory and per-process: correct for a single Uvicorn worker, which
    is fine at the current (pre-queue) scale, but does not coordinate
    across multiple worker processes or machines. Phase 7 introduces
    Redis, which would be the natural place to make this distributed.
    """

    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]

        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()

        if len(hits) >= self.max_requests:
            retry_after = self.window_seconds - (now - hits[0])
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({self.max_requests} per "
                f"{int(self.window_seconds)}s). Try again in {max(retry_after, 0):.0f}s.",
                headers={"Retry-After": str(max(int(retry_after) + 1, 1))},
            )

        hits.append(now)
