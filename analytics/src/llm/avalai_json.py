"""Request complete JSON output; never save empty or partial model responses."""

import json
import logging
from typing import Any

log = logging.getLogger("customer_ai_service")


async def generate_customer_json(
    client: Any, *, model: str, api_style: str, prompt: str, max_tokens: int
) -> dict[str, Any]:
    for attempt in range(2):
        instruction = "Return only a complete JSON object with a non-empty summary. No commentary."
        if attempt:
            instruction += " The previous response was empty, incomplete or invalid. Keep the answer concise."
        if api_style == "responses":
            response = await client.responses.create(
                model=model,
                instructions=instruction,
                input=prompt,
                max_output_tokens=max_tokens,
                text={"format": {"type": "json_object"}},
            )
            raw = response.output_text or ""
            finish = getattr(response, "status", None)
            incomplete = finish not in (None, "completed")
            detail = getattr(response, "incomplete_details", None)
            reason = getattr(detail, "reason", None)
        else:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            choice = response.choices[0] if response.choices else None
            raw = (choice.message.content or "") if choice else ""
            finish = choice.finish_reason if choice else "no_choices"
            incomplete = finish not in (None, "stop")
            reason = "refusal" if choice and getattr(choice.message, "refusal", None) else None

        try:
            if incomplete or reason:
                raise ValueError("incomplete or refused output")
            if not isinstance(raw, str) or not raw.strip():
                raise ValueError("empty output")
            cleaned = raw.strip()
            if cleaned.startswith("```json") and cleaned.endswith("```"):
                cleaned = cleaned[7:-3].strip()
            elif cleaned.startswith("```") and cleaned.endswith("```"):
                cleaned = cleaned[3:-3].strip()
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise ValueError("output is not a JSON object")
            if not isinstance(parsed.get("summary"), str) or not parsed["summary"].strip():
                raise ValueError("missing summary")
            return parsed
        except ValueError as exc:
            # Log metadata, not customer data or model reasoning.
            log.warning(
                "AvalAI invalid output model=%s attempt=%s response_id=%s "
                "finish=%s reason=%s characters=%s error=%s",
                model, attempt + 1, getattr(response, "id", None),
                finish, reason, len(raw) if isinstance(raw, str) else 0, exc,
            )
            if attempt == 1:
                raise ValueError(
                    f"AvalAI did not return complete customer JSON after 2 attempts "
                    f"(model={model}, finish={finish}, reason={reason}): {exc}"
                ) from exc
    raise AssertionError("unreachable")
