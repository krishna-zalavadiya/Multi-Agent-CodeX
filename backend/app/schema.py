"""
app/schemas.py
CodeSentinel — Pydantic Request / Response Schemas
Owner (this file): SPLIT OWNERSHIP
  - TOP HALF    → Naivadh (RawFinding, RawAgentOutput) — to be added by Naivadh
  - BOTTOM HALF → Kishan  (API schemas) — written below

NOTE FOR NAIVADH:
  Add your RawFinding and RawAgentOutput classes ABOVE the
  "API SCHEMAS — KISHAN" section. Do not modify anything below that line.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models import FindingCategory, FindingSeverity, ReviewStatus


# ==============================================================================
# [NAIVADH'S SECTION — ADD RawFinding + RawAgentOutput ABOVE THIS LINE]
# ==============================================================================


# ==============================================================================
# API SCHEMAS — KISHAN
# Shared base config + all public API request/response models
# ==============================================================================


class APIBaseModel(BaseModel):
    """
    Shared base config for all API schemas.
    - orm_mode (from_attributes) lets us build schemas from SQLAlchemy models
    - populate_by_name allows using both alias and field name
    """
    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


# ------------------------------------------------------------------------------
# Request Schemas
# ------------------------------------------------------------------------------

class ReviewRequest(APIBaseModel):
    """
    POST /api/v1/review — request body.
    Sent by the frontend when submitting code for review.
    """
    code: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Source code to review",
    )
    language: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Programming language (e.g. 'python', 'javascript')",
    )

    @field_validator("code")
    @classmethod
    def code_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("code must not be blank or whitespace only")
        return v

    @field_validator("language")
    @classmethod
    def language_must_be_alphanumeric(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned.replace("+", "").replace("#", "").isalnum():
            raise ValueError(
                "language must contain only letters, numbers, '+', or '#' "
                "(e.g. 'python', 'c++', 'c#')"
            )
        return cleaned


# ------------------------------------------------------------------------------
# Finding Schema — used inside review responses
# ------------------------------------------------------------------------------

class FindingSchema(APIBaseModel):
    """
    A single issue found by one of the agents.
    Nested inside ReviewStatusResponse.
    """
    id: uuid.UUID
    category: FindingCategory
    severity: FindingSeverity
    severity_order: int
    title: str
    description: str
    suggestion: Optional[str] = None
    line_number: Optional[int] = None
    created_at: datetime

    @classmethod
    def from_finding(cls, finding: Any) -> "FindingSchema":
        """Build from a Finding ORM object."""
        return cls(
            id=finding.id,
            category=finding.category,
            severity=finding.severity,
            severity_order=finding.severity_order,
            title=finding.title,
            description=finding.description,
            suggestion=finding.suggestion,
            line_number=finding.line_number,
            created_at=finding.created_at,
        )


# ------------------------------------------------------------------------------
# Agent Results Grouping — groups findings by agent category
# ------------------------------------------------------------------------------

class AgentResultsSchema(APIBaseModel):
    """
    Findings grouped by which agent produced them.
    Makes it easy for the frontend to show results per agent.
    """
    bugs: List[FindingSchema] = Field(default_factory=list)
    security: List[FindingSchema] = Field(default_factory=list)
    performance: List[FindingSchema] = Field(default_factory=list)

    @classmethod
    def from_findings(cls, findings: List[Any]) -> "AgentResultsSchema":
        """Group a flat list of Finding ORM objects by category."""
        bugs, security, performance = [], [], []
        for f in findings:
            schema = FindingSchema.from_finding(f)
            if f.category == FindingCategory.BUG:
                bugs.append(schema)
            elif f.category == FindingCategory.SECURITY:
                security.append(schema)
            elif f.category == FindingCategory.PERFORMANCE:
                performance.append(schema)
        return cls(bugs=bugs, security=security, performance=performance)


# ------------------------------------------------------------------------------
# Response Schemas
# ------------------------------------------------------------------------------

class ReviewCreatedResponse(APIBaseModel):
    """
    POST /api/v1/review → 202 Accepted response.
    Returns the review ID so the frontend can start polling.
    """
    review_id: uuid.UUID
    status: ReviewStatus
    message: str = "Review submitted successfully. Poll /review/{review_id} for results."

    @classmethod
    def from_review(cls, review: Any) -> "ReviewCreatedResponse":
        return cls(
            review_id=review.id,
            status=review.status,
        )


class ReviewStatusResponse(APIBaseModel):
    """
    GET /api/v1/review/{review_id} → 200 response.
    Returns current status + findings (if complete).
    """
    review_id: uuid.UUID
    status: ReviewStatus
    language: str
    total_findings_count: int
    results: Optional[AgentResultsSchema] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    @classmethod
    def from_review(cls, review: Any, agent_progress: Optional[Dict] = None) -> "ReviewStatusResponse":
        """
        Build from a Review ORM object.
        agent_progress: optional dict from Redis with live agent status.
        """
        results = None
        if review.status == ReviewStatus.DONE and review.findings:
            results = AgentResultsSchema.from_findings(review.findings)

        return cls(
            review_id=review.id,
            status=review.status,
            language=review.language,
            total_findings_count=review.total_findings_count,
            results=results,
            error_message=review.error_message,
            created_at=review.created_at,
            updated_at=review.updated_at,
            completed_at=review.completed_at,
        )


class ReviewCancelResponse(APIBaseModel):
    """
    DELETE /api/v1/review/{review_id} → 200 response.
    """
    review_id: uuid.UUID
    status: ReviewStatus
    message: str = "Review cancelled successfully."

    @classmethod
    def from_review(cls, review: Any) -> "ReviewCancelResponse":
        return cls(
            review_id=review.id,
            status=review.status,
        )


class HealthResponse(APIBaseModel):
    """
    GET /api/v1/health → 200 response.
    Always returns 200 — load balancers check HTTP status.
    Monitoring systems check the 'status' field in the body.
    """
    status: str                          # "healthy" | "degraded" | "unhealthy"
    version: str
    environment: str
    services: Dict[str, Dict[str, str]]  # e.g. {"database": {"status": "healthy"}}


# ------------------------------------------------------------------------------
# Error Schemas
# ------------------------------------------------------------------------------

class ErrorDetail(APIBaseModel):
    """Single error detail object."""
    field: Optional[str] = None          # which field caused the error (if any)
    message: str


class ErrorResponse(APIBaseModel):
    """
    Standard error response shape for all 4xx / 5xx responses.
    Registered as the exception handler response in main.py.
    """
    error: str                           # short error code e.g. "not_found"
    message: str                         # human readable message
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None     # from X-Request-ID header