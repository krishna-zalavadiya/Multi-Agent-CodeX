import asyncio

from backend.app.agents.bug_agent import run_bug_detector, extract_json_from_response


# ==============================
# Test JSON Extraction
# ==============================

def test_extract_json_from_response():
    text = """
    Here is the result:
    ```json
    {
        "findings": [
            {
                "type": "bug",
                "line": 1,
                "severity": "high",
                "message": "division by zero",
                "suggestion": "check denominator"
            }
        ]
    }
    ```
    """

    result = extract_json_from_response(text)

    assert "findings" in result
    assert isinstance(result["findings"], list)


# ==============================
# Test Bug Agent (no crash)
# ==============================

def test_run_bug_detector_no_crash():
    code = "def f(): return 1/0"

    result = asyncio.run(run_bug_detector(code, "python"))

    assert isinstance(result, dict)
    assert "findings" in result


# ==============================
# Test Empty Input
# ==============================

def test_empty_input():
    result = asyncio.run(run_bug_detector("", "python"))

    assert isinstance(result, dict)
    assert "findings" in result