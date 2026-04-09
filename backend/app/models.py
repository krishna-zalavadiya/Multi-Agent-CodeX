import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from enum import Enum as PyEnum

class Base(DeclarativeBase): pass

class ReviewStatus(str, PyEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"

class FindingCategory(str, PyEnum):
    BUG = "bug"
    SECURITY = "security"
    PERFORMANCE = "performance"

class Review(Base):
    __tablename__ = "reviews"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    total_findings_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    findings = relationship("Finding", back_populates="review", cascade="all, delete-orphan")

class Finding(Base):
    __tablename__ = "findings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"))
    category = Column(Enum(FindingCategory))
    severity = Column(String(20))
    title = Column(String(255))
    description = Column(Text)
    suggestion = Column(Text)
    line_number = Column(Integer, nullable=True)
    review = relationship("Review", back_populates="findings")