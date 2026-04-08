"""
app/database.py
CodeSentinel — Async SQLAlchemy Engine + Session Factory
Owner: Kishan (Backend Lead)
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from sqlalchemy import text

from app.config import settings
from app.models import Base

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Engine
# ------------------------------------------------------------------
# NullPool is used during tests so connections don't bind to a single
# event loop. For production, SQLAlchemy uses AsyncAdaptedQueuePool
# by default — we only override it in test mode via DATABASE_URL.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,          # logs all SQL if DEBUG=True
    pool_pre_ping=True,                   # test connection before checkout
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
)

# Test engine — uses NullPool, created only when needed by pytest
test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,                   # prevents event loop binding in tests
)


# ------------------------------------------------------------------
# Session factories
# ------------------------------------------------------------------
# expire_on_commit=False prevents MissingGreenlet errors when
# accessing model attributes after an async commit
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

test_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ------------------------------------------------------------------
# FastAPI dependency — get_db()
# Used in routes.py as:  db: AsyncSession = Depends(get_db)
# ------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session.
    Automatically commits on success, rolls back on any exception.

    Usage in routes.py:
        @router.post("/review")
        async def create_review(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Database error, rolling back: {e}")
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Unexpected error, rolling back: {e}")
            raise
        finally:
            await session.close()


# ------------------------------------------------------------------
# Celery context manager — get_session()
# Used in Naivadh's aggregator_node and Kishan's tasks.py
# ------------------------------------------------------------------
@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager for database sessions outside FastAPI
    (e.g. Celery tasks, LangGraph aggregator node).

    Usage in tasks.py or graph.py:
        async with get_session() as session:
            session.add(review)
            await session.commit()
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error(f"Database session error, rolling back: {e}")
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Unexpected session error, rolling back: {e}")
            raise
        finally:
            await session.close()


# ------------------------------------------------------------------
# Database health check — used by GET /health endpoint
# ------------------------------------------------------------------
async def check_database_health() -> dict:
    """
    Ping the database to confirm it is reachable.
    Returns a dict with status and optional error message.

    Usage in routes.py health endpoint:
        db_health = await check_database_health()
    """
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "error": None}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


# ------------------------------------------------------------------
# Table creation — used during development startup
# ------------------------------------------------------------------
async def create_all_tables() -> None:
    """
    Create all tables defined in models.py.
    Called from app/main.py lifespan() on startup.

    In production, use Alembic migrations instead.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("All database tables created successfully.")


async def drop_all_tables() -> None:
    """
    Drop all tables — only used in tests.
    Never call this in production!
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All database tables dropped.")