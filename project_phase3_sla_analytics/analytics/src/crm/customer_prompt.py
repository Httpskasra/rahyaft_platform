import json
from typing import Any


def build_customer_analysis_prompt(
    snapshot: dict[str, Any],
    extra_instruction: str | None = None,
) -> str:
    return f"""
You are a CRM analysis engine for a Persian medical/beauty equipment sales and repair company.

Return ONLY one valid JSON object.
Do NOT return markdown.
Do NOT return code fences.
Do NOT explain anything outside JSON.
All JSON keys MUST be exactly in English as shown below.
All text values SHOULD be in Persian.

Required JSON shape:
{{
  "summary": "خلاصه فارسی کوتاه و کاربردی از وضعیت مشتری",
  "riskLevel": "LOW",
  "salesPotential": "HIGH",
  "nextBestAction": "اقدام بعدی دقیق برای کارمند",
  "tags": ["برچسب فارسی ۱", "برچسب فارسی ۲", "برچسب فارسی ۳"],
  "insights": {{
    "repairAnalysis": "تحلیل کوتاه وضعیت تعمیرات",
    "salesAnalysis": "تحلیل کوتاه فرصت فروش",
    "communicationAnalysis": "تحلیل کوتاه ارتباطات و مخاطبین",
    "followUpAnalysis": "تحلیل کوتاه پیگیری بعدی"
  }}
}}

Rules:
- riskLevel MUST be exactly one of: LOW, MEDIUM, HIGH.
- salesPotential MUST be exactly one of: LOW, MEDIUM, HIGH.
- tags MUST be a real JSON array of Persian strings.
- insights MUST be a real JSON object, not a string.
- Do not put JSON text inside a string.
- If there are no repairs, repairAnalysis should say in Persian that no repair case exists.
- If there is an active sales opportunity with high priority or high probability, salesPotential should usually be HIGH.
- nextBestAction must be practical and specific.
- The final answer must start with {{ and end with }}.

Customer data:
{json.dumps(snapshot, ensure_ascii=False, indent=2)}

Extra instruction:
{extra_instruction or "None"}
""".strip()