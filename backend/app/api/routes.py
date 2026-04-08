"""
app/api/routes.py
CodeSentinel — FastAPI Route Handlers
Owner: Kishan (Backend Lead)

Endpoints:
    POST   /api/v1/review           → Submit code for review
    GET    /api/v1/review/{id}      → Poll review status + results
    DELETE /api/v1/review/{id}      → Cancel a review
    GET    /api/v1/health           → Health check
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings, get_settings, Settings
from app.database import get_db, check_database_health
from app.models import Review, ReviewStatus, create_review
from app.schema import (
    ReviewRequest,
    ReviewCreatedResponse,
    ReviewStatusResponse,
    ReviewCancelResponse,
    HealthResponse,
    ErrorResponse,
)

router = APIRouter(prefix=settings.API_PREFIX, tags=["reviews"])


# ------------------------------------------------------------------------------
# Helper — fetch review or raise 404
# ------------------------------------------------------------------------------
async def get_review_or_404(review_id: uuid.UUID, db: AsyncSession) -> Review:
    """
    Fetch a Review by ID from the database.
    Raises HTTP 404 if not found.
    """
    result = await db.execute(
        select(Review).where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review {review_id} not found.",
        )
    return review


# ------------------------------------------------------------------------------
# POST /api/v1/review — Submit code for review
# ------------------------------------------------------------------------------
@router.post(
    "/review",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ReviewCreatedResponse,
    summary="Submit code for review",
    description="Submits code to the multi-agent review pipeline. Returns a review_id to poll for results.",
)
async def submit_review(
    request: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    config: Settings = Depends(get_settings),
) -> ReviewCreatedResponse:
    """
    1. Create a Review record in the database (status=PENDING)
    2. Flush to get the UUID without committing
    3. Dispatch a Celery task with that UUID
    4. Commit the transaction
    5. Return 202 with the review_id
    """
    # Step 1 — create the ORM object
    review = create_review(
        code=request.code,
        language=request.language,
    )
    db.add(review)

    # Step 2 — flush to get the UUID before committing
    await db.flush()

    # Step 3 — dispatch Celery task (import here to avoid circular imports)
    try:
        from app.worker.tasks import run_review
        task = run_review.apply_async(
            kwargs={
                "review_id": str(review.id),
                "code": request.code,
                "language": request.language,
            },
            queue="reviews",
            soft_time_limit=config.CELERY_TASK_SOFT_TIME_LIMIT,
            time_limit=config.CELERY_TASK_HARD_TIME_LIMIT,
        )
        # Save Celery task ID so we can revoke it later
        review.celery_task_id = task.id
    except Exception as exc:
        # If Celery is unavailable, mark as error immediately
        review.status = ReviewStatus.ERROR
        review.error_message = f"Failed to dispatch review task: {str(exc)}"

    # Step 4 — commit (get_db() auto-commits on exit, but explicit is clearer)
    await db.commit()
    await db.refresh(review)

    # Step 5 — return 202
    return ReviewCreatedResponse.from_review(review)


# ------------------------------------------------------------------------------
# GET /api/v1/review/{review_id} — Poll review status
# ------------------------------------------------------------------------------
@router.get(
    "/review/{review_id}",
    status_code=status.HTTP_200_OK,
    response_model=ReviewStatusResponse,
    summary="Get review status and results",
    description="Poll this endpoint to check review progress. Returns findings when status is 'done'.",
)
async def get_review_status(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ReviewStatusResponse:
    """
    - Terminal states (done / error / cancelled) → served from PostgreSQL
    - Active states (pending / running) → served from PostgreSQL
      (can be enriched from Redis for live agent progress in future)
    """
    review = await get_review_or_404(review_id, db)
    return ReviewStatusResponse.from_review(review)


# ------------------------------------------------------------------------------
# DELETE /api/v1/review/{review_id} — Cancel a review
# ------------------------------------------------------------------------------
@router.delete(
    "/review/{review_id}",
    status_code=status.HTTP_200_OK,
    response_model=ReviewCancelResponse,
    summary="Cancel a review",
    description="Cancels a pending or running review. Has no effect if review is already complete.",
)
async def cancel_review(
    review_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ReviewCancelResponse:
    """
    1. Fetch the review
    2. Check it's not already in a terminal state
    3. Revoke the Celery task (fire and forget)
    4. Update status to CANCELLED in DB
    5. Return 200
    """
    review = await get_review_or_404(review_id, db)

    # Step 2 — reject if already terminal
    terminal_states = {ReviewStatus.DONE, ReviewStatus.ERROR, ReviewStatus.CANCELLED}
    if review.status in terminal_states:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Review {review_id} is already in terminal state '{review.status}'. Cannot cancel.",
        )

    # Step 3 — revoke Celery task (reply=False = fire and forget, don't wait)
    if review.celery_task_id:
        try:
            from app.worker.celery_app import celery_app
            celery_app.control.revoke(
                review.celery_task_id,
                terminate=True,
                signal="SIGTERM",
                reply=False,
            )
        except Exception:
            # Celery revoke failure should not block the DB update
            pass

    # Step 4 — update DB
    review.status = ReviewStatus.CANCELLED
    await db.commit()
    await db.refresh(review)

    # Step 5 — return 200
    return ReviewCancelResponse.from_review(review)


# ------------------------------------------------------------------------------
# GET /api/v1/health — Health check
# ------------------------------------------------------------------------------
@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    response_model=HealthResponse,
    summary="Health check",
    description="Returns health status of all services. Always returns HTTP 200 — check the 'status' field in the body.",
)
async def health_check(
    config: Settings = Depends(get_settings),
) -> HealthResponse:
    """
    Checks:
    - PostgreSQL connectivity
    - (Redis / Celery can be added here later)

    Always returns HTTP 200 — load balancers rely on the status code.
    Monitoring systems should read the 'status' field in the response body.
    """
    db_health = await check_database_health()

    # Determine overall status
    all_healthy = db_health["status"] == "healthy"
    overall_status = "healthy" if all_healthy else "degraded"

    return HealthResponse(
        status=overall_status,
        version=config.APP_VERSION,
        environment=config.ENVIRONMENT,
        services={
            "database": db_health,
        },
    )