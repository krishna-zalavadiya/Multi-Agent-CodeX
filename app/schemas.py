from typing import List, Optional
from pydantic import BaseModel, field_validator


# ==============================
# Raw Finding (from AI)
# ==============================

class RawFinding(BaseModel):
    type: str
    line: Optional[int] = None
    severity: str
    message: str
    suggestion: str

    @field_validator("severity")
    @classmethod
    def normalize_severity(cls, v):
        allowed = ["low", "medium", "high", "critical"]
        v = v.lower()

        if v not in allowed:
            return "low"

        return v


# ==============================
# Raw Agent Output
# ==============================

class RawAgentOutput(BaseModel):
    findings: List[RawFinding]

    @field_validator("findings")
    @classmethod
    def cap_findings(cls, v):
        # limit total findings to avoid overload
        return v[:50]