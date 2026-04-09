import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Review, ReviewStatus
from app.schema import ReviewRequest, ReviewCreatedResponse, ReviewStatusResponse
from app.orchestrator.graph import run_review_pipeline

router = APIRouter(prefix="/api/v1", tags=["reviews"])

@router.post("/review", status_code=202, response_model=ReviewCreatedResponse)
async def submit_review(
    request: ReviewRequest, 
    background_tasks: BackgroundTasks, 
    db: AsyncSession = Depends(get_db)
):
    review = Review(code=request.code, language=request.language, status=ReviewStatus.PENDING)
    db.add(review)
    await db.commit()
    await db.refresh(review)

    # Trigger background logic directly
    background_tasks.add_task(run_review_pipeline, str(review.id), request.code, request.language)
    
    return ReviewCreatedResponse(review_id=review.id, status=review.status)

@router.get("/review/{review_id}", response_model=ReviewStatusResponse)
async def get_status(review_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewStatusResponse.from_review(review)