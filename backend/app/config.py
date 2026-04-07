"""
app/config.py
CodeSentinel — Pydantic Settings
Owner: Kishan (Backend Lead)
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central config — reads all values from environment variables.
    All fields map directly to keys in .env / .env.example
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # silently ignore unknown env vars
    )

    # ------------------------------------------------------------------
    # App
    # ------------------------------------------------------------------
    APP_NAME: str = Field(default="CodeSentinel", description="Application name")
    APP_VERSION: str = Field(default="0.1.0", description="Application version")
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="development | production")

    # ------------------------------------------------------------------
    # PostgreSQL  (must use +asyncpg driver)
    # ------------------------------------------------------------------
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/codesentinel",
        description="Async PostgreSQL connection string — must start with postgresql+asyncpg",
    )

    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DATABASE_ECHO: bool = Field(default=False, description="Log all SQL statements")

    # ------------------------------------------------------------------
    # Redis / Celery
    # ------------------------------------------------------------------
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection string used as Celery broker + backend",
    )
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=300, description="Soft time limit per review task in seconds"
    )
    CELERY_TASK_HARD_TIME_LIMIT: int = Field(
        default=360, description="Hard time limit per review task in seconds"
    )

    # ------------------------------------------------------------------
    # Ollama  (used by Naivadh's OllamaClient)
    # ------------------------------------------------------------------
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434",
        description="Base URL of the local Ollama server",
    )
    OLLAMA_MODEL: str = Field(
        default="deepseek-coder-v2",
        description="Model name to use for all agents",
    )
    OLLAMA_TIMEOUT: int = Field(
        default=120,
        description="Read timeout in seconds for Ollama API calls",
    )
    OLLAMA_NUM_CTX: int = Field(
        default=8192,
        description="Context window size (num_ctx) passed to Ollama",
    )
    OLLAMA_NUM_PREDICT: int = Field(
        default=2048,
        description="Max tokens to generate (num_predict) passed to Ollama",
    )
    OLLAMA_TEMPERATURE: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="Sampling temperature for the model",
    )

    # ------------------------------------------------------------------
    # API / CORS
    # ------------------------------------------------------------------
    API_PREFIX: str = Field(default="/api/v1", description="Global API route prefix")
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        description="Comma-separated list of allowed CORS origins",
    )
    REQUEST_ID_HEADER: str = Field(
        default="X-Request-ID",
        description="Header name used to propagate request IDs",
    )

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------
    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_must_use_asyncpg(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg"):
            raise ValueError(
                "DATABASE_URL must use the asyncpg driver — "
                "e.g. postgresql+asyncpg://user:pass@host:5432/dbname"
            )
        return v

    @field_validator("ENVIRONMENT")
    @classmethod
    def environment_must_be_valid(cls, v: str) -> str:
        allowed = {"development", "production", "test"}
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}, got '{v}'")
        return v.lower()

    @field_validator("OLLAMA_BASE_URL")
    @classmethod
    def ollama_url_must_not_have_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    # ------------------------------------------------------------------
    # Computed properties
    # ------------------------------------------------------------------
    @computed_field  # type: ignore[misc]
    @property
    def allowed_origins_list(self) -> List[str]:
        """Split comma-separated ALLOWED_ORIGINS into a Python list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @computed_field  # type: ignore[misc]
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @computed_field  # type: ignore[misc]
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @computed_field  # type: ignore[misc]
    @property
    def celery_broker_url(self) -> str:
        """Explicit broker URL for Celery (same as REDIS_URL)."""
        return self.REDIS_URL

    @computed_field  # type: ignore[misc]
    @property
    def celery_result_backend(self) -> str:
        """Explicit result backend URL for Celery (same as REDIS_URL)."""
        return self.REDIS_URL


def validate_startup_config(settings: Settings) -> None:
    """
    Run at application startup (inside lifespan).
    Raises ValueError with a clear message if anything critical is misconfigured.
    Call this from app/main.py lifespan() before the app starts serving traffic.
    """
    errors: List[str] = []

    if settings.is_production and settings.DEBUG:
        errors.append("DEBUG must be False in production.")

    if settings.is_production and "localhost" in settings.DATABASE_URL:
        errors.append("DATABASE_URL points to localhost — not safe for production.")

    if settings.is_production and "localhost" in settings.OLLAMA_BASE_URL:
        errors.append("OLLAMA_BASE_URL points to localhost — not safe for production.")

    if settings.CELERY_TASK_SOFT_TIME_LIMIT >= settings.CELERY_TASK_HARD_TIME_LIMIT:
        errors.append(
            "CELERY_TASK_SOFT_TIME_LIMIT must be strictly less than "
            "CELERY_TASK_HARD_TIME_LIMIT."
        )

    if errors:
        raise ValueError("Startup config validation failed:\n" + "\n".join(f"  • {e}" for e in errors))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached singleton Settings instance.
    Use as a FastAPI dependency:  settings: Settings = Depends(get_settings)
    Or import directly:           from app.config import get_settings; settings = get_settings()
    """
    return Settings()


# Module-level singleton — safe to import anywhere
settings = get_settings()