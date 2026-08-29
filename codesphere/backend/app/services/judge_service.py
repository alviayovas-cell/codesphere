import asyncio
import base64
import logging
import time

import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.models.common import Verdict

logger = logging.getLogger(__name__)

# Judge0 status.id -> our normalized Verdict.
# https://github.com/judge0/judge0/blob/master/docs/statuses.md
_STATUS_MAP: dict[int, Verdict] = {
    3: Verdict.ACCEPTED,
    4: Verdict.WRONG_ANSWER,
    5: Verdict.TIME_LIMIT_EXCEEDED,
    6: Verdict.COMPILATION_ERROR,
    7: Verdict.RUNTIME_ERROR,  # SIGSEGV
    8: Verdict.RUNTIME_ERROR,  # SIGXFSZ
    9: Verdict.RUNTIME_ERROR,  # SIGFPE
    10: Verdict.RUNTIME_ERROR,  # SIGABRT
    11: Verdict.RUNTIME_ERROR,  # NZEC
    12: Verdict.RUNTIME_ERROR,  # Other runtime error
    13: Verdict.INTERNAL_ERROR,  # Judge0 internal error
    14: Verdict.INTERNAL_ERROR,  # Exec format error
}


class JudgeServiceError(Exception):
    """Raised when Judge0 cannot be reached or returns something unusable,
    after retries are exhausted."""


class ExecutionResult(BaseModel):
    verdict: Verdict
    stdout: str = ""
    stderr: str = ""
    compile_output: str = ""
    status_description: str = ""
    time_seconds: float | None = None
    memory_kb: int | None = None


def _b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _unb64(text: str | None) -> str:
    if not text:
        return ""
    return base64.b64decode(text).decode("utf-8", errors="replace")


class JudgeService:
    """Thin async client around a Judge0 instance.

    Never executes student code itself - every submission is delegated to
    the configured Judge0 API over HTTP, using base64-encoded payloads so
    arbitrary source code / stdin content survives the JSON round trip.
    """

    def __init__(
        self,
        api_url: str | None = None,
        api_key: str | None = None,
        api_host: str | None = None,
        language_id: int | None = None,
        timeout_seconds: float | None = None,
    ):
        self.api_url = (api_url or settings.judge0_api_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.judge0_api_key
        self.api_host = api_host if api_host is not None else settings.judge0_api_host
        self.language_id = language_id or settings.judge0_c_language_id
        self.timeout_seconds = timeout_seconds or settings.judge0_request_timeout_seconds

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-RapidAPI-Key"] = self.api_key
        if self.api_host:
            headers["X-RapidAPI-Host"] = self.api_host
        return headers

    async def execute(
        self, source_code: str, stdin: str = "", expected_output: str | None = None, max_retries: int = 2
    ) -> ExecutionResult:
        payload = {
            "source_code": _b64(source_code),
            "language_id": self.language_id,
            "stdin": _b64(stdin),
        }
        if expected_output is not None:
            payload["expected_output"] = _b64(expected_output)

        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        f"{self.api_url}/submissions",
                        params={"base64_encoded": "true", "wait": "true"},
                        json=payload,
                        headers=self._headers(),
                    )
                response.raise_for_status()
                return self._parse(response.json())
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning("Judge0 request failed (attempt %d/%d): %s", attempt + 1, max_retries + 1, exc)
                if attempt < max_retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
            except httpx.HTTPStatusError as exc:
                logger.error("Judge0 returned an error status: %s", exc)
                raise JudgeServiceError(f"Judge0 request failed: {exc}") from exc

        raise JudgeServiceError(f"Judge0 is unreachable after {max_retries + 1} attempts: {last_error}")

    @staticmethod
    def _parse(data: dict) -> ExecutionResult:
        status = data.get("status") or {}
        status_id = status.get("id")
        verdict = _STATUS_MAP.get(status_id, Verdict.INTERNAL_ERROR)

        time_value = data.get("time")
        memory_value = data.get("memory")

        return ExecutionResult(
            verdict=verdict,
            stdout=_unb64(data.get("stdout")),
            stderr=_unb64(data.get("stderr")),
            compile_output=_unb64(data.get("compile_output")),
            status_description=status.get("description", ""),
            time_seconds=float(time_value) if time_value is not None else None,
            memory_kb=int(memory_value) if memory_value is not None else None,
        )


class SyncJudgeService:
    """Synchronous twin of JudgeService, for use inside RQ worker jobs.

    RQ's standard worker model runs job functions as plain sync
    callables in a separate process, so this uses httpx.Client instead
    of AsyncClient. Shares the same payload/response handling
    (JudgeService._parse, _b64/_unb64, _STATUS_MAP) to avoid duplicating
    the actual Judge0 protocol logic.
    """

    def __init__(
        self,
        api_url: str | None = None,
        api_key: str | None = None,
        api_host: str | None = None,
        language_id: int | None = None,
        timeout_seconds: float | None = None,
    ):
        self.api_url = (api_url or settings.judge0_api_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.judge0_api_key
        self.api_host = api_host if api_host is not None else settings.judge0_api_host
        self.language_id = language_id or settings.judge0_c_language_id
        self.timeout_seconds = timeout_seconds or settings.judge0_request_timeout_seconds

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-RapidAPI-Key"] = self.api_key
        if self.api_host:
            headers["X-RapidAPI-Host"] = self.api_host
        return headers

    def execute(
        self, source_code: str, stdin: str = "", expected_output: str | None = None, max_retries: int = 2
    ) -> ExecutionResult:
        payload = {
            "source_code": _b64(source_code),
            "language_id": self.language_id,
            "stdin": _b64(stdin),
        }
        if expected_output is not None:
            payload["expected_output"] = _b64(expected_output)

        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.post(
                        f"{self.api_url}/submissions",
                        params={"base64_encoded": "true", "wait": "true"},
                        json=payload,
                        headers=self._headers(),
                    )
                response.raise_for_status()
                return JudgeService._parse(response.json())
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                logger.warning("Judge0 request failed (attempt %d/%d): %s", attempt + 1, max_retries + 1, exc)
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))
            except httpx.HTTPStatusError as exc:
                logger.error("Judge0 returned an error status: %s", exc)
                raise JudgeServiceError(f"Judge0 request failed: {exc}") from exc

        raise JudgeServiceError(f"Judge0 is unreachable after {max_retries + 1} attempts: {last_error}")
