import httpx
import json
import re

from app.agents.prompts import build_bug_prompt


# ==============================
# Ollama Client (shared)
# ==============================

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434", model="deepseek-coder-v2"):
        self.base_url = base_url
        self.model = model

    async def chat(self, messages):
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "stream": False,
                    "messages": messages,
                },
            )
            return response.json()


# ==============================
# JSON Extraction
# ==============================

def extract_json_from_response(text: str):
    try:
        # Remove markdown formatting if present
        text = re.sub(r"```json|```", "", text).strip()

        # Find JSON boundaries
        start = text.find("{")
        end = text.rfind("}") + 1
        json_str = text[start:end]

        return json.loads(json_str)

    except Exception:
        return {"findings": []}


# ==============================
# Main Bug Detector
# ==============================

async def run_bug_detector(code: str, language: str):
    client = OllamaClient()

    try:
        # Build prompt using prompts.py
        messages = build_bug_prompt(code, language)

        # Send to Ollama
        response = await client.chat(messages)

        # Extract content from response
        content = response.get("message", {}).get("content", "")

        # Parse JSON safely
        parsed = extract_json_from_response(content)

        return parsed

    except Exception:
        # Never crash — return empty findings
        return {"findings": []}