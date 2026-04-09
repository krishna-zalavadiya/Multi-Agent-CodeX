import asyncio
from typing import Dict, Any

from app.agents.bug_agent import run_bug_detector
from app.agents.security_agent import run_security_analyst
from app.agents.perf_agent import run_optimization_advisor

from app.orchestrator.state import create_initial_state


# ==============================
# Run All Agents in Parallel
# ==============================

async def run_agents(state):
    code = state["code"]
    language = state["language"]

    results = await asyncio.gather(
        run_bug_detector(code, language),
        run_security_analyst(code, language),
        run_optimization_advisor(code, language),
    )

    return results


# ==============================
# Aggregator (combine results)
# ==============================

def aggregate_results(results):
    all_findings = []

    for result in results:
        findings = result.get("findings", [])
        all_findings.extend(findings)

    return all_findings


# ==============================
# Main Pipeline Entry
# ==============================

async def run_review_pipeline(
    review_id: str,
    code: str,
    language: str
) -> Dict[str, Any]:

    state = create_initial_state(code, language)

    try:
        state["pipeline_status"] = "running"

        # Run agents in parallel
        results = await run_agents(state)

        # Aggregate results
        all_findings = aggregate_results(results)

        state["findings"] = all_findings
        state["pipeline_status"] = "done"

        return {
            "pipeline_status": state["pipeline_status"],
            "total_findings_count": len(all_findings),
            "error_message": "",
        }

    except Exception as e:
        state["pipeline_status"] = "error"
        state["error_message"] = str(e)

        return {
            "pipeline_status": "error",
            "total_findings_count": 0,
            "error_message": str(e),
        }