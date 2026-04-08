"""
app/main.py
CodeSentinel — FastAPI App Factory + Middleware + Lifespan
Owner: Kishan (Backend Lead)
"""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings, validate_startup_config
from app.database import create_all_tables

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("codesentinel")


# ------------------------------------------------------------------------------
# Lifespan — runs on startup and shutdown
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:  validate config → create DB tables → log ready
    Shutdown: log goodbye (DB engine cleanup is automatic)
    """
    config = get_settings()

    # 1 — Validate config before accepting any traffic
    logger.info("Validating startup configuration...")
    validate_startup_config(config)
    logger.info("✅ Config valid.")

    # 2 — Create database tables if they don't exist
    # NOTE: In production use Alembic migrations instead
    logger.info("Creating database tables...")
    await create_all_tables()
    logger.info("✅ Database tables ready.")

    logger.info(
        f"🚀 CodeSentinel {config.APP_VERSION} started "
        f"[{config.ENVIRONMENT}] on prefix '{config.API_PREFIX}'"
    )

    yield  # App is now running and serving traffic

    # Shutdown
    logger.info("👋 CodeSentinel shutting down...")


# ------------------------------------------------------------------------------
# App Factory
# ------------------------------------------------------------------------------
def create_app() -> FastAPI:
    """
    Creates and configures the FastAPI application.
    Called once at module level — result is the 'app' object
    that uvicorn imports.
    """
    config = get_settings()

    app = FastAPI(
        title="CodeSentinel",
        description="Multi-Agent AI Code Reviewer — powered by LangGraph + DeepSeek Coder V2",
        version=config.APP_VERSION,
        docs_url=f"{config.API_PREFIX}/docs",
        redoc_url=f"{config.API_PREFIX}/redoc",
        openapi_url=f"{config.API_PREFIX}/openapi.json",
        lifespan=lifespan,
    )

    # ------------------------------------------------------------------
    # Middleware (order matters — first registered = outermost layer)
    # ------------------------------------------------------------------

    # 1 — CORS — allows frontend (e.g. localhost:3000) to call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
        expose_headers=[config.REQUEST_ID_HEADER],
    )

    # 2 — GZip — compresses large responses (findings lists etc.)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # 3 — Request ID middleware — adds unique ID to every request
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        """
        Attaches a unique X-Request-ID to every request + response.
        Useful for tracing errors across logs.
        """
        request_id = request.headers.get(
            config.REQUEST_ID_HEADER, str(uuid.uuid4())
        )
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[config.REQUEST_ID_HEADER] = request_id
        return response

    # 4 — Security headers middleware
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        """
        Adds basic security headers to every response.
        """
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # ------------------------------------------------------------------
    # Exception Handlers
    # ------------------------------------------------------------------

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "not_found",
                "message": str(exc.detail) if hasattr(exc, "detail") else "Resource not found.",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(409)
    async def conflict_handler(request: Request, exc):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "conflict",
                "message": str(exc.detail) if hasattr(exc, "detail") else "Conflict.",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc):
        logger.error(f"Internal server error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again later.",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred.",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    # ------------------------------------------------------------------
    # Register Routers
    # ------------------------------------------------------------------
    from app.api.routes import router
    app.include_router(router)

    logger.info("✅ Routes registered.")
    return app


# ------------------------------------------------------------------------------
# Module-level app instance — uvicorn imports this
# Run with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# ------------------------------------------------------------------------------
app = create_app()