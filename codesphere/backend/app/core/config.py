from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CodeSphere API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "codesphere"

    jwt_secret_key: str = "dev-only-insecure-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 720

    # Defaults to the free public Judge0 CE demo instance (ce.judge0.com) so the
    # app works out of the box in development. It is rate-limited and NOT
    # suitable for a real coding event - use a self-hosted or RapidAPI-hosted
    # Judge0 instance in production (see TTD section 9/12).
    judge0_api_url: str = "https://ce.judge0.com"
    judge0_api_key: str | None = None
    judge0_api_host: str | None = None
    judge0_c_language_id: int = 50  # C (GCC 9.2.0) on Judge0 CE
    judge0_request_timeout_seconds: float = 30.0

    run_rate_limit_per_minute: int = 5
    submit_rate_limit_per_minute: int = 3

    redis_url: str = "redis://localhost:6379/0"
    run_job_timeout_seconds: int = 45
    submit_job_timeout_seconds: int = 120
    job_result_ttl_seconds: int = 3600

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
