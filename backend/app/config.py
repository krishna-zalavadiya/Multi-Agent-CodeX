"""
app/config.py
CodeSentinel — Pydantic Settings
Owner: Kishan (Backend Lead)

Updated: Added retry logic, security, logging, code validation,
         celery tuning, DB timeout, strong startup validation,
         and Ollama helper URLs.
"""

import secrets
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
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # App
    # ------------------------------------------------------------------
    APP_NAME: str = Field(default="CodeSentinel", description="Application name")
    APP_VERSION: str = Field(default="0.1.0", description="Application version")
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="development | production | test")

    # ------------------------------------------------------------------
    # Security ✅ NEW
    # ------------------------------------------------------------------
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="Secret key for signing tokens and sessions. "
                    "MUST be set explicitly in production via env var.",
    )
    SECRET_KEY_MIN_LENGTH: int = Field(
        default=32,
        description="Minimum acceptable length for SECRET_KEY in production",
    )

    # ------------------------------------------------------------------
    # PostgreSQL
    # ------------------------------------------------------------------
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/codesentinel",
        description="Async PostgreSQL connection string — must start with postgresql+asyncpg",
    )
    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DATABASE_ECHO: bool = Field(default=False, description="Log all SQL statements")

    # DB Timeout ✅ NEW
    DATABASE_CONNECT_TIMEOUT: int = Field(
        default=10,
        description="Seconds to wait when establishing a new DB connection",
    )
    DATABASE_COMMAND_TIMEOUT: int = Field(
        default=30,
        description="Seconds to wait for a DB query to complete",
    )
    DATABASE_POOL_RECYCLE: int = Field(
        default=1800,
        description="Recycle connections older than this many seconds (prevents stale connections)",
    )

    # ------------------------------------------------------------------
    # Redis / Celery
    # ------------------------------------------------------------------
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection string used as Celery broker + backend",
    )

    # Celery Tuning ✅ NEW
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=300,
        description="Soft time limit per review task in seconds (catchable)",
    )
    CELERY_TASK_HARD_TIME_LIMIT: int = Field(
        default=360,
        description="Hard time limit per review task in seconds (SIGKILL)",
    )
    CELERY_WORKER_CONCURRENCY: int = Field(
        default=2,
        description="Number of concurrent Celery worker processes",
    )
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = Field(
        default=1,
        description="Tasks prefetched per worker — keep at 1 for long-running tasks",
    )
    CELERY_TASK_MAX_RETRIES: int = Field(
        default=3,
        description="Maximum number of times a failed task will be retried",
    )
    CELERY_TASK_RETRY_BACKOFF: int = Field(
        default=5,
        description="Base seconds for exponential backoff between task retries",
    )
    CELERY_RESULT_EXPIRES: int = Field(
        default=3600,
        description="Seconds before Celery task results are deleted from Redis",
    )

    # ------------------------------------------------------------------
    # Ollama
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

    # Retry Logic ✅ NEW
    OLLAMA_MAX_RETRIES: int = Field(
        default=3,
        description="Max retry attempts for failed Ollama API calls",
    )
    OLLAMA_RETRY_MIN_WAIT: int = Field(
        default=1,
        description="Minimum seconds to wait between Ollama retries",
    )
    OLLAMA_RETRY_MAX_WAIT: int = Field(
        default=10,
        description="Maximum seconds to wait between Ollama retries (exponential backoff cap)",
    )

    # ------------------------------------------------------------------
    # Code Validation Limits ✅ NEW
    # ------------------------------------------------------------------
    MAX_CODE_LENGTH: int = Field(
        default=50_000,
        description="Maximum number of characters allowed in submitted code",
    )
    MIN_CODE_LENGTH: int = Field(
        default=10,
        description="Minimum number of characters required in submitted code",
    )
    MAX_LANGUAGE_LENGTH: int = Field(
        default=50,
        description="Maximum length of the language string",
    )
    SUPPORTED_LANGUAGES: str = Field(
        default="python,javascript,typescript,java,go,rust,cpp,c,csharp",
        description="Comma-separated list of supported programming languages",
    )

    # ------------------------------------------------------------------
    # Logging ✅ NEW
    # ------------------------------------------------------------------
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level — DEBUG | INFO | WARNING | ERROR | CRITICAL",
    )
    LOG_FORMAT: str = Field(
        default="json",
        description="Log output format — json (production) | text (development)",
    )
    LOG_ENABLE_STRUCTLOG: bool = Field(
        default=True,
        description="Use structlog for structured JSON logging",
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

    @field_validator("LOG_LEVEL")
    @classmethod
    def log_level_must_be_valid(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {allowed}")
        return v.upper()

    @field_validator("LOG_FORMAT")
    @classmethod
    def log_format_must_be_valid(cls, v: str) -> str:
        allowed = {"json", "text"}
        if v.lower() not in allowed:
            raise ValueError(f"LOG_FORMAT must be one of {allowed}")
        return v.lower()

    # ------------------------------------------------------------------
    # Computed Properties
    # ------------------------------------------------------------------
    @computed_field  # type: ignore[misc]
    @property
    def allowed_origins_list(self) -> List[str]:
        """Split comma-separated ALLOWED_ORIGINS into a Python list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @computed_field  # type: ignore[misc]
    @property
    def supported_languages_list(self) -> List[str]:
        """Split comma-separated SUPPORTED_LANGUAGES into a Python list."""
        return [l.strip().lower() for l in self.SUPPORTED_LANGUAGES.split(",") if l.strip()]

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
        return self.REDIS_URL

    @computed_field  # type: ignore[misc]
    @property
    def celery_result_backend(self) -> str:
        return self.REDIS_URL

    # Ollama Helper URLs ✅ NEW
    @computed_field  # type: ignore[misc]
    @property
    def ollama_chat_url(self) -> str:
        """Full URL for Ollama /api/chat — used by Naivadh's OllamaClient."""
        return f"{self.OLLAMA_BASE_URL}/api/chat"

    @computed_field  # type: ignore[misc]
    @property
    def ollama_generate_url(self) -> str:
        """Full URL for Ollama /api/generate endpoint."""
        return f"{self.OLLAMA_BASE_URL}/api/generate"

    @computed_field  # type: ignore[misc]
    @property
    def ollama_tags_url(self) -> str:
        """Full URL to list available Ollama models — used in health check."""
        return f"{self.OLLAMA_BASE_URL}/api/tags"


# ------------------------------------------------------------------
# Strong Startup Validation ✅ NEW
# ------------------------------------------------------------------
def validate_startup_config(settings: "Settings") -> None:
    """
    Run at application startup inside lifespan().
    Raises ValueError with clear messages if anything is misconfigured.
    """
    errors: List[str] = []

    # Production safety checks
    if settings.is_production:
        if settings.DEBUG:
            errors.append("DEBUG must be False in production.")

        if len(settings.SECRET_KEY) < settings.SECRET_KEY_MIN_LENGTH:
            errors.append(
                f"SECRET_KEY is too short for production "
                f"(min {settings.SECRET_KEY_MIN_LENGTH} chars)."
            )

        if "localhost" in settings.DATABASE_URL:
            errors.append("DATABASE_URL points to localhost — not safe for production.")

        if "localhost" in settings.OLLAMA_BASE_URL:
            errors.append("OLLAMA_BASE_URL points to localhost — not safe for production.")

        if "password" in settings.DATABASE_URL:
            errors.append("DATABASE_URL contains 'password' — looks like a placeholder.")

        if settings.LOG_FORMAT != "json":
            errors.append("LOG_FORMAT should be 'json' in production.")

    # Celery time limit sanity check
    if settings.CELERY_TASK_SOFT_TIME_LIMIT >= settings.CELERY_TASK_HARD_TIME_LIMIT:
        errors.append(
            "CELERY_TASK_SOFT_TIME_LIMIT must be strictly less than "
            "CELERY_TASK_HARD_TIME_LIMIT."
        )

    # Retry logic sanity check
    if settings.OLLAMA_RETRY_MIN_WAIT >= settings.OLLAMA_RETRY_MAX_WAIT:
        errors.append(
            "OLLAMA_RETRY_MIN_WAIT must be less than OLLAMA_RETRY_MAX_WAIT."
        )

    # Code length sanity check
    if settings.MIN_CODE_LENGTH >= settings.MAX_CODE_LENGTH:
        errors.append("MIN_CODE_LENGTH must be less than MAX_CODE_LENGTH.")

    # DB timeout sanity check
    if settings.DATABASE_CONNECT_TIMEOUT <= 0:
        errors.append("DATABASE_CONNECT_TIMEOUT must be greater than 0.")

    if errors:
        raise ValueError(
            "Startup config validation failed:\n" +
            "\n".join(f"  • {e}" for e in errors)
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Cached singleton Settings instance.
    Use as FastAPI dependency: settings: Settings = Depends(get_settings)
    Or import directly:        from app.config import settings
    """
    return Settings()


# Module-level singleton — safe to import anywhere
settings = get_settings()