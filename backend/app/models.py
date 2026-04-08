"""
app/models.py
CodeSentinel — SQLAlchemy ORM Models
Owner: Kishan (Backend Lead)
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


# ------------------------------------------------------------------
# Base class — all models inherit from this
# ------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ------------------------------------------------------------------
# Enums
# ------------------------------------------------------------------
class ReviewStatus(str, PyEnum):
    """
    Lifecycle of a code review request.
    Naivadh imports this enum into orchestrator/state.py
    """
    PENDING   = "pending"    # Task created, waiting in Celery queue
    RUNNING   = "running"    # Agents are actively reviewing the code
    DONE      = "done"       # All agents finished, findings saved
    ERROR     = "error"      # Something went wrong during review
    CANCELLED = "cancelled"  # User cancelled before completion


class FindingSeverity(str, PyEnum):
    """
    Severity levels for individual findings.
    Naivadh's normalize_severity() validator maps raw LLM output to these.
    """
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"
    INFO     = "info"


class FindingCategory(str, PyEnum):
    """
    Which agent produced the finding.
    """
    BUG      = "bug"
    SECURITY = "security"
    PERFORMANCE = "performance"


# ------------------------------------------------------------------
# Review Model — one row per /api/v1/review POST request
# ------------------------------------------------------------------
class Review(Base):
    __tablename__ = "reviews"

    # Primary key — UUID so it's safe to expose in API responses
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # The code submitted for review
    code = Column(Text, nullable=False)

    # Programming language (e.g. "python", "javascript")
    language = Column(String(50), nullable=False)

    # Current status of the review pipeline
    status = Column(
        Enum(ReviewStatus, name="review_status_enum"),
        nullable=False,
        default=ReviewStatus.PENDING,
        index=True,
    )

    # Celery task ID — used to revoke (cancel) the task
    celery_task_id = Column(String(255), nullable=True)

    # Total number of findings across all agents
    total_findings_count = Column(Integer, nullable=False, default=0)

    # Error message if status == ERROR
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship — one Review has many Findings
    findings = relationship(
        "Finding",
        back_populates="review",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Review id={self.id} language={self.language} status={self.status}>"


# ------------------------------------------------------------------
# Finding Model — one row per issue found by an agent
# ------------------------------------------------------------------
class Finding(Base):
    __tablename__ = "findings"

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Foreign key → reviews.id
    review_id = Column(
        UUID(as_uuid=True),
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Which agent found this issue
    category = Column(
        Enum(FindingCategory, name="finding_category_enum"),
        nullable=False,
        index=True,
    )

    # Severity level
    severity = Column(
        Enum(FindingSeverity, name="finding_severity_enum"),
        nullable=False,
        index=True,
    )

    # Numeric severity for easy ORDER BY (lower = more severe)
    severity_order = Column(Integer, nullable=False, default=99)

    # Short title of the issue (e.g. "SQL Injection Risk")
    title = Column(String(255), nullable=False)

    # Full description of the issue
    description = Column(Text, nullable=False)

    # Suggested fix from the agent
    suggestion = Column(Text, nullable=True)

    # Line number in the submitted code (if available)
    line_number = Column(Integer, nullable=True)

    # Timestamp
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship back to Review
    review = relationship("Review", back_populates="findings")

    def __repr__(self) -> str:
        return f"<Finding id={self.id} category={self.category} severity={self.severity}>"


# ------------------------------------------------------------------
# Indexes — for fast queries
# ------------------------------------------------------------------
Index("ix_reviews_status_created", Review.status, Review.created_at)
Index("ix_findings_review_severity", Finding.review_id, Finding.severity_order)


# ------------------------------------------------------------------
# Severity order mapping
# ------------------------------------------------------------------
SEVERITY_ORDER: dict[str, int] = {
    FindingSeverity.CRITICAL : 1,
    FindingSeverity.HIGH     : 2,
    FindingSeverity.MEDIUM   : 3,
    FindingSeverity.LOW      : 4,
    FindingSeverity.INFO     : 5,
}


# ------------------------------------------------------------------
# Factory helpers — used by Naivadh's aggregator_node in graph.py
# ------------------------------------------------------------------
def create_review(code: str, language: str, celery_task_id: str | None = None) -> Review:
    """
    Create a new Review ORM object (not yet saved to DB).
    Kishan's routes.py calls this on POST /api/v1/review.

    Usage:
        review = create_review(code="def f(): pass", language="python")
        db.add(review)
        await db.flush()   # gets the UUID without committing
    """
    return Review(
        id=uuid.uuid4(),
        code=code,
        language=language,
        status=ReviewStatus.PENDING,
        celery_task_id=celery_task_id,
        total_findings_count=0,
    )


def create_finding(
    review_id: uuid.UUID,
    category: FindingCategory,
    severity: FindingSeverity,
    title: str,
    description: str,
    suggestion: str | None = None,
    line_number: int | None = None,
) -> Finding:
    """
    Create a new Finding ORM object (not yet saved to DB).
    Naivadh's aggregator_node in graph.py calls this for each RawFinding.

    Usage:
        finding = create_finding(
            review_id=review.id,
            category=FindingCategory.BUG,
            severity=FindingSeverity.HIGH,
            title="Division by zero",
            description="Line 5 may raise ZeroDivisionError",
            suggestion="Add a check before dividing",
            line_number=5,
        )
        db.add(finding)
    """
    return Finding(
        id=uuid.uuid4(),
        review_id=review_id,
        category=category,
        severity=severity,
        severity_order=SEVERITY_ORDER.get(severity, 99),
        title=title,
        description=description,
        suggestion=suggestion,
        line_number=line_number,
    )