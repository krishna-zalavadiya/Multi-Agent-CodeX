from typing import TypedDict, List
from typing_extensions import Annotated
import operator


# ==============================
# Shared State Definition
# ==============================

class ReviewGraphState(TypedDict):
    code: str
    language: str

    # Each agent appends to this list
    findings: Annotated[List[dict], operator.add]

    # Status tracking
    pipeline_status: str  # "pending" | "running" | "done" | "error"
    error_message: str


# ==============================
# Helper Functions
# ==============================

def create_initial_state(code: str, language: str) -> ReviewGraphState:
    return {
        "code": code,
        "language": language,
        "findings": [],
        "pipeline_status": "pending",
        "error_message": "",
    }


def get_all_findings(state: ReviewGraphState):
    return state.get("findings", [])


def serialize_state_for_redis(state: ReviewGraphState):
    # For now, just return the state as-is
    # (later backend may store this)
    return state