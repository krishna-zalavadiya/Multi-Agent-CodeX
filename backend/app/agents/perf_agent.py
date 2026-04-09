from backend.app.agents.prompts import build_perf_prompt
from backend.app.agents.bug_agent import OllamaClient, extract_json_from_response


# ==============================
# Deduplication Logic
# ==============================

def _deduplicate_findings(findings):
    seen = set()
    unique = []

    for f in findings:
        key = (f.get("message"), f.get("line"))

        if key not in seen:
            seen.add(key)
            unique.append(f)

    return unique


# ==============================
# Cap Low-Value Findings
# ==============================

def _cap_info_findings(findings, max_info=3):
    result = []
    info_count = 0

    for f in findings:
        if f.get("severity") == "low":
            if info_count < max_info:
                result.append(f)
                info_count += 1
        else:
            result.append(f)

    return result


# ==============================
# Main Performance Agent
# ==============================

async def run_optimization_advisor(code: str, language: str):
    client = OllamaClient()

    try:
        # Build prompt
        messages = build_perf_prompt(code, language)

        # Call AI
        response = await client.chat(messages)

        content = response.get("message", {}).get("content", "")

        parsed = extract_json_from_response(content)

        findings = parsed.get("findings", [])

        # Apply deduplication
        findings = _deduplicate_findings(findings)

        # Apply cap on low severity findings
        findings = _cap_info_findings(findings)

        return {"findings": findings}

    except Exception:
        return {"findings": []}