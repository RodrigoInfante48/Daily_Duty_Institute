# shared/config.py — Configuración centralizada
# Ver sprint-02-fastapi-core/01-fundamentos/GUIDE.md para implementación completa

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la aplicación cargada desde .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "DDI API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/ddi"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    API_KEY_HEADER: str = "X-API-Key"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    RATE_LIMIT_PER_MINUTE: int = 60


def get_settings() -> Settings:
    return Settings()
