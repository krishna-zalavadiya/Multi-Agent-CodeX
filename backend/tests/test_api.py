"""
tests/test_api.py
CodeSentinel — API Endpoint Integration Tests
Owner: Kishan (Backend Lead)

Runs against a real FastAPI app with:
- SQLite in-memory database (no PostgreSQL needed)
- Celery tasks mocked (no Redis needed)
- All 4 endpoints tested

Run with: pytest tests/test_api.py -v
"""

import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.database import get_db
from app.models import Base, Review, ReviewStatus
from app.main import app

# ------------------------------------------------------------------------------
# Test database — SQLite in-memory (no PostgreSQL required)
# ------------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_codesentinel.db"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """
    Creates a fresh SQLite engine for each test function.
    NullPool avoids event-loop conflicts between tests.
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after each test — clean slate
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provides a database session bound to the test SQLite engine."""
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(test_engine) -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an AsyncClient with:
    - get_db overridden to use SQLite test DB
    - Celery tasks mocked (no Redis needed)
    """
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    # Override the real DB with test SQLite DB
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # Clean up override after test
    app.dependency_overrides.clear()


# ------------------------------------------------------------------------------
# Sample test data
# ------------------------------------------------------------------------------
SAMPLE_CODE = """
def divide(a, b):
    return a / b  # potential ZeroDivisionError

password = "hardcoded_secret_123"  # security issue
"""

VALID_PAYLOAD = {
    "code": SAMPLE_CODE,
    "language": "python",
}


# ------------------------------------------------------------------------------
# POST /api/v1/review — Submit review tests
# ------------------------------------------------------------------------------
class TestSubmitReview:

    @pytest.mark.asyncio
    async def test_submit_returns_202(self, client: AsyncClient):
        """POST /review should return 202 Accepted."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        assert response.status_code == 202

    @pytest.mark.asyncio
    async def test_submit_returns_review_id(self, client: AsyncClient):
        """Response should contain a valid UUID review_id."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        data = response.json()
        assert "review_id" in data
        # Should be a valid UUID
        uuid.UUID(data["review_id"])

    @pytest.mark.asyncio
    async def test_submit_status_is_pending(self, client: AsyncClient):
        """Newly created review should have PENDING status."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        assert response.json()["status"] == "pending"

    @pytest.mark.asyncio
    async def test_submit_empty_code_returns_422(self, client: AsyncClient):
        """Empty code should be rejected with 422 Unprocessable Entity."""
        response = await client.post(
            "/api/v1/review",
            json={"code": "   ", "language": "python"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_submit_missing_language_returns_422(self, client: AsyncClient):
        """Missing language field should return 422."""
        response = await client.post(
            "/api/v1/review",
            json={"code": SAMPLE_CODE},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_submit_missing_code_returns_422(self, client: AsyncClient):
        """Missing code field should return 422."""
        response = await client.post(
            "/api/v1/review",
            json={"language": "python"},
        )
        assert response.status_code == 422


# ------------------------------------------------------------------------------
# GET /api/v1/review/{review_id} — Poll status tests
# ------------------------------------------------------------------------------
class TestGetReviewStatus:

    @pytest.mark.asyncio
    async def test_poll_existing_review_returns_200(self, client: AsyncClient):
        """Polling an existing review should return 200."""
        # First create a review
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            create_response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        review_id = create_response.json()["review_id"]

        # Now poll it
        response = await client.get(f"/api/v1/review/{review_id}")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_poll_nonexistent_review_returns_404(self, client: AsyncClient):
        """Polling a non-existent review_id should return 404."""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/review/{fake_id}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_poll_response_has_required_fields(self, client: AsyncClient):
        """Poll response should contain all required fields."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            create_response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        review_id = create_response.json()["review_id"]
        response = await client.get(f"/api/v1/review/{review_id}")
        data = response.json()

        assert "review_id" in data
        assert "status" in data
        assert "language" in data
        assert "total_findings_count" in data
        assert "created_at" in data


# ------------------------------------------------------------------------------
# DELETE /api/v1/review/{review_id} — Cancel review tests
# ------------------------------------------------------------------------------
class TestCancelReview:

    @pytest.mark.asyncio
    async def test_cancel_pending_review_returns_200(self, client: AsyncClient):
        """Cancelling a PENDING review should return 200."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            create_response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        review_id = create_response.json()["review_id"]

        with patch("app.api.routes.celery_app") as mock_celery:
            response = await client.delete(f"/api/v1/review/{review_id}")

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_review_returns_404(self, client: AsyncClient):
        """Cancelling a non-existent review should return 404."""
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"/api/v1/review/{fake_id}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_already_cancelled_returns_409(self, client: AsyncClient):
        """Cancelling an already cancelled review should return 409 Conflict."""
        with patch("app.api.routes.run_review") as mock_task:
            mock_task.apply_async.return_value = MagicMock(id=str(uuid.uuid4()))
            create_response = await client.post("/api/v1/review", json=VALID_PAYLOAD)

        review_id = create_response.json()["review_id"]

        # Cancel once
        with patch("app.api.routes.celery_app"):
            await client.delete(f"/api/v1/review/{review_id}")

        # Cancel again — should get 409
        with patch("app.api.routes.celery_app"):
            response = await client.delete(f"/api/v1/review/{review_id}")

        assert response.status_code == 409


# ------------------------------------------------------------------------------
# GET /api/v1/health — Health check tests
# ------------------------------------------------------------------------------
class TestHealthCheck:

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client: AsyncClient):
        """Health endpoint should always return 200."""
        with patch("app.api.routes.check_database_health") as mock_health:
            mock_health.return_value = {"status": "healthy", "detail": "OK"}
            response = await client.get("/api/v1/health")

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_response_has_required_fields(self, client: AsyncClient):
        """Health response should have status, version, environment, services."""
        with patch("app.api.routes.check_database_health") as mock_health:
            mock_health.return_value = {"status": "healthy", "detail": "OK"}
            response = await client.get("/api/v1/health")

        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "environment" in data
        assert "services" in data

    @pytest.mark.asyncio
    async def test_health_returns_200_even_when_degraded(self, client: AsyncClient):
        """Health endpoint should return 200 even when DB is down."""
        with patch("app.api.routes.check_database_health") as mock_health:
            mock_health.return_value = {"status": "unhealthy", "detail": "DB down"}
            response = await client.get("/api/v1/health")

        assert response.status_code == 200
        assert response.json()["status"] == "degraded"


# ------------------------------------------------------------------------------
# Middleware tests
# ------------------------------------------------------------------------------
class TestMiddleware:

    @pytest.mark.asyncio
    async def test_response_has_request_id_header(self, client: AsyncClient):
        """Every response should have an X-Request-ID header."""
        with patch("app.api.routes.check_database_health") as mock_health:
            mock_health.return_value = {"status": "healthy", "detail": "OK"}
            response = await client.get("/api/v1/health")

        assert "x-request-id" in response.headers

    @pytest.mark.asyncio
    async def test_response_has_security_headers(self, client: AsyncClient):
        """Every response should have security headers."""
        with patch("app.api.routes.check_database_health") as mock_health:
            mock_health.return_value = {"status": "healthy", "detail": "OK"}
            response = await client.get("/api/v1/health")

        assert "x-content-type-options" in response.headers
        assert "x-frame-options" in response.headers