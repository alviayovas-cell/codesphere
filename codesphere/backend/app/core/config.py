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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
