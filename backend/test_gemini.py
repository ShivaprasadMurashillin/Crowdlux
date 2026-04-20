import google.generativeai as genai
import json
import os
import pytest

def _extract_json_response(raw_text: str) -> dict:
    text = raw_text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    if "```" in text:
        parts = text.split("```")
        for part in parts[1:]:
            cleaned = part.strip()
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
            try:
                return json.loads(cleaned)
            except Exception:
                continue

    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(text[start:end])

    raise ValueError("Unable to parse JSON response from Gemini")


@pytest.mark.integration
def test_gemini_json_response_contract():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        pytest.skip("GEMINI_API_KEY is not set; skipping integration test")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = """You are CrowdluxAI, a stadium crowd-navigation assistant.
Given stadium zone data, respond ONLY with a valid JSON object (no markdown, no explanation).
Use EXACTLY these keys: wait_minutes (number), crowd_level (string), recommendation (string), alternative_zone (string or null), alternative_wait (number or null), best_time_to_go (string), tip (string).

Stadium data: {"gate_a": {"current_count": 500, "capacity": 1000, "name": "Gate A"}}
Event phase: live

User question: Where is the nearest restroom?"""

    response = model.generate_content([{"role": "user", "parts": [prompt]}])
    parsed = _extract_json_response(response.text)

    expected_keys = {
        "wait_minutes",
        "crowd_level",
        "recommendation",
        "alternative_zone",
        "alternative_wait",
        "best_time_to_go",
        "tip",
    }
    assert expected_keys.issubset(set(parsed.keys()))
