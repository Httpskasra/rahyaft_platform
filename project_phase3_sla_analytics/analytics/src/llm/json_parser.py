import json
from typing import Any


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.replace("```json", "").replace("```", "").strip()

    first = cleaned.find("{")
    last = cleaned.rfind("}")

    if first == -1 or last == -1 or last <= first:
        raise ValueError("Model response does not contain a valid JSON object")

    json_text = cleaned[first:last + 1]
    parsed = json.loads(json_text)

    if not isinstance(parsed, dict):
        raise ValueError("Model JSON response is not an object")

    return parsed


def normalize_level(value: Any) -> str | None:
    if value in ("LOW", "MEDIUM", "HIGH"):
        return value

    if isinstance(value, str):
        upper_value = value.strip().upper()
        if upper_value in ("LOW", "MEDIUM", "HIGH"):
            return upper_value

    return None


def normalize_tags(value: Any) -> list[str] | None:
    if isinstance(value, list):
        tags = [str(item).strip() for item in value if str(item).strip()]
        return tags[:10]

    if isinstance(value, str):
        # اگر مدل tags را به صورت رشته یا JSON string برگرداند
        stripped = value.strip()

        if not stripped:
            return None

        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                tags = [str(item).strip() for item in parsed if str(item).strip()]
                return tags[:10]
        except json.JSONDecodeError:
            pass

        # fallback برای حالت "tag1, tag2, tag3"
        tags = [item.strip() for item in stripped.split(",") if item.strip()]
        return tags[:10] if tags else None

    return None


def ensure_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value

    if isinstance(value, str):
        stripped = value.strip()

        if not stripped:
            return {}

        try:
            parsed = json.loads(stripped)

            if isinstance(parsed, dict):
                return parsed

            return {"raw": parsed}
        except json.JSONDecodeError:
            return {"raw": stripped}

    return {"raw": value}