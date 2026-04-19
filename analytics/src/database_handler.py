"""
Async PostgreSQL writer for analysis results.
Uses asyncpg directly (same connection pool as the worker).
"""
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg

log = logging.getLogger("analytics.db")


async def upsert_form_stat(
    conn: asyncpg.Connection,
    form_id: str,
    field_id: str,
    metric: str,
    value: Any,
) -> None:
    """Upsert a row in FormStat (field-level rolling stats)."""
    new_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO "FormStat" (id, "formId", "fieldId", metric, value, "updatedAt")
        VALUES ($1, $2, $3, $4, $5::jsonb, now())
        ON CONFLICT ("formId", "fieldId", metric)
        DO UPDATE SET value = $5::jsonb, "updatedAt" = now()
        """,
        new_id,
        form_id,
        field_id,
        metric,
        json.dumps(value),
    )


async def upsert_form_analysis(
    conn: asyncpg.Connection,
    form_id: str,
    field_id: str | None,
    metric: str,
    value: Any,
    source: str = "analytics-worker",
) -> None:
    """Upsert a row in FormAnalysis (AI/rule-based insights)."""
    new_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO "FormAnalysis" (id, "formId", "fieldId", metric, value, source, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, now(), now())
        ON CONFLICT ("formId", "fieldId", metric)
        DO UPDATE SET value = $5::jsonb, source = $6, "updatedAt" = now()
        """,
        new_id,
        form_id,
        field_id,  # can be None
        metric,
        json.dumps(value),
        source,
    )


async def get_historical_stats(
    conn: asyncpg.Connection,
    form_id: str,
) -> dict[str, dict]:
    """Fetch existing FormStat rows to use for anomaly baseline."""
    rows = await conn.fetch(
        """SELECT "fieldId", metric, value FROM "FormStat" WHERE "formId" = $1""",
        form_id,
    )
    stats: dict[str, dict] = {}
    for row in rows:
        fid = row["fieldId"]
        if fid not in stats:
            stats[fid] = {}
        try:
            val = json.loads(row["value"]) if isinstance(row["value"], str) else row["value"]
            stats[fid][row["metric"]] = val
        except Exception:
            pass
    return stats


async def get_all_field_values(
    conn: asyncpg.Connection,
    form_id: str,
    field_id: str,
) -> list:
    """Return all historical values for a specific field (for rolling stats)."""
    rows = await conn.fetch(
        """
        SELECT data->$2 as field_value
        FROM "FormSubmission"
        WHERE "formId" = $1 AND data ? $2
        """,
        form_id,
        field_id,
    )
    result = []
    for row in rows:
        v = row["field_value"]
        if v is not None:
            try:
                parsed = json.loads(v) if isinstance(v, str) else v
                result.append(parsed)
            except Exception:
                result.append(v)
    return result
