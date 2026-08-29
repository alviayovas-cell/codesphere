from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CodeSphere API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "codesphere"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
