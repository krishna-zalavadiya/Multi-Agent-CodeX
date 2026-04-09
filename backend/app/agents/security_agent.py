import json

from backend.app.agents.prompts import build_security_prompt
from backend.app.agents.bug_agent import OllamaClient, extract_json_from_response


# ==============================
# Post-processing (Security Logic)
# ==============================

def _escalate_credential_severity(findings):
    for f in findings:
        message = f.get("message", "").lower()

        # If sensitive info detected → escalate severity
        if "password" in message or "api key" in message or "secret" in message:
            f["severity"] = "critical"

    return findings


# ==============================
# Main Security Agent
# ==============================

async def run_security_analyst(code: str, language: str):
    client = OllamaClient()

    try:
        # Build prompt
        messages = build_security_prompt(code, language)

        # Call AI
        response = await client.chat(messages)

        content = response.get("message", {}).get("content", "")

        parsed = extract_json_from_response(content)

        findings = parsed.get("findings", [])

        # Apply post-processing
        findings = _escalate_credential_severity(findings)

        return {"findings": findings}

    except Exception:
        return {"findings": []}