import json
from typing import Any

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Shipped in source (and in .env.example) as an obvious, documented dev-only
# placeholder - anyone can read it on GitHub. If a deployment ever runs with
# this value and ENVIRONMENT != "development", every JWT the server issues
# (including admin tokens) could be forged by anyone who knows this string.
# validate_for_production() below refuses to start in that case.
INSECURE_DEFAULT_JWT_SECRET = "dev-only-insecure-secret-change-me-in-production"


class Settings(BaseSettings):
    app_name: str = "CodeSphere API"
    environment: str = "development"
    cors_origins: list[str] | str = ["http://localhost:5173"]

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = Field(
        default="codesphere",
        validation_alias=AliasChoices("MONGODB_DB_NAME", "MONGODB_DATABASE", "mongodb_db_name"),
    )

    jwt_secret_key: str = Field(
        default=INSECURE_DEFAULT_JWT_SECRET,
        validation_alias=AliasChoices("JWT_SECRET_KEY", "JWT_SECRET", "jwt_secret_key"),
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = Field(
        default=720,
        validation_alias=AliasChoices(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "JWT_EXPIRE_MINUTES", "jwt_access_token_expire_minutes"
        ),
    )

    # Defaults to the free public Judge0 CE demo instance (ce.judge0.com) so the
    # app works out of the box in development. It is rate-limited and NOT
    # suitable for a real coding event - use a self-hosted or RapidAPI-hosted
    # Judge0 instance in production (see TTD section 9/12).
    judge0_api_url: str = Field(
        default="https://ce.judge0.com",
        validation_alias=AliasChoices("JUDGE0_API_URL", "JUDGE0_URL", "judge0_api_url"),
    )
    judge0_api_key: str | None = None
    judge0_api_host: str | None = None
    judge0_c_language_id: int = 50  # C (GCC 9.2.0) on Judge0 CE
    judge0_request_timeout_seconds: float = 30.0

    run_rate_limit_per_minute: int = 5
    submit_rate_limit_per_minute: int = 3

    redis_url: str = "redis://localhost:6379/0"
    # These must comfortably exceed SyncJudgeService.execute's own worst-case
    # retry budget (judge0_request_timeout_seconds * 2 attempts + a short
    # sleep between them, ~61s at the defaults above) - otherwise RQ kills
    # the job mid-retry before JudgeService even gives up on its own,
    # turning a slow-but-recoverable Judge0 response into a hard failure.
    # Both Run and Submit run the first test case sequentially (to short-
    # circuit on a compile error) before the rest in parallel, so each
    # one's worst case is roughly double a single call's.
    run_job_timeout_seconds: int = 140
    submit_job_timeout_seconds: int = 140
    job_result_ttl_seconds: int = 3600

    # Opt-in: run the RQ worker as a background thread of this same web
    # process instead of a separate process/service. Exists for free-tier
    # deployments where a separate Background Worker service isn't
    # available (e.g. Render's free plan). See
    # app/workers/run_worker.py's start_inline_worker_thread().
    run_worker_inline: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            parts = [item.strip() for item in v.split(",") if item.strip()]
            return parts if parts else ["http://localhost:5173"]
        elif isinstance(v, (list, tuple, set)):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", populate_by_name=True, extra="ignore"
    )

    def validate_for_production(self) -> None:
        """Fail fast, before anything starts serving traffic or processing
        jobs, if a non-development deployment is still using the public
        placeholder JWT secret. Called at import time below so it covers
        every entrypoint that loads settings (the API, the worker, and any
        one-off script) - not just app.main."""
        if self.environment != "development" and self.jwt_secret_key == INSECURE_DEFAULT_JWT_SECRET:
            raise RuntimeError(
                "JWT_SECRET_KEY is still the insecure development default, but ENVIRONMENT is "
                f"'{self.environment}'. Set a real secret via the JWT_SECRET_KEY environment "
                "variable before running outside development, e.g.: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )


settings = Settings()
settings.validate_for_production()
