"""
Data pre-processing utilities for form field values.
Handles cleaning, type coercion, and feature extraction.
"""
import re
from typing import Any


def clean_text(text: Any) -> str:
    """Normalize a text value: lowercase, strip extra whitespace."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_number(value: Any) -> float | None:
    """Safely coerce a value to float."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(',', ''))
        except ValueError:
            return None
    return None


def extract_field_features(schema: dict, data: dict) -> dict:
    """
    Convert raw form submission data into a flat feature dict.
    Returns: { "field_<id>": cleaned_value, ... }
    """
    features: dict[str, Any] = {}
    for field in schema.get("fields", []):
        fid = field.get("id")
        ftype = field.get("type", "text")
        raw = data.get(fid)

        if ftype == "number":
            features[f"field_{fid}"] = extract_number(raw)
        else:
            features[f"field_{fid}"] = clean_text(raw) if raw else ""

    return features
