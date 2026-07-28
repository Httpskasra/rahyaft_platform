import json
import uuid
from typing import Any

import asyncpg


def _json_default(value: Any) -> str:
    return str(value)


def _to_dict(row: asyncpg.Record | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


async def fetch_customer_snapshot(
    conn: asyncpg.Connection,
    customer_id: str,
) -> dict[str, Any] | None:
    customer = await conn.fetchrow(
        """
        SELECT *
        FROM "Customer"
        WHERE id = $1
        """,
        customer_id,
    )

    if not customer:
        return None

    contacts = await conn.fetch(
        """
        SELECT *
        FROM "CustomerContact"
        WHERE "customerId" = $1
        ORDER BY "isPrimary" DESC, "createdAt" DESC
        """,
        customer_id,
    )

    sales = await conn.fetch(
        """
        SELECT *
        FROM "SalesOpportunity"
        WHERE "customerId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 10
        """,
        customer_id,
    )

    activities = await conn.fetch(
        """
        SELECT *
        FROM "CustomerActivity"
        WHERE "customerId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 30
        """,
        customer_id,
    )

    analyses = await conn.fetch(
        """
        SELECT *
        FROM "CustomerAiAnalysis"
        WHERE "customerId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 1
        """,
        customer_id,
    )

    repairs = await conn.fetch(
        """
        SELECT *
        FROM "RepairCase"
        WHERE "customerId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 10
        """,
        customer_id,
    )

    snapshot = {
        "customer": _to_dict(customer),
        "contacts": [dict(row) for row in contacts],
        "salesOpportunities": [dict(row) for row in sales],
        "activities": [dict(row) for row in activities],
        "latestAiAnalysis": dict(analyses[0]) if analyses else None,
        "repairs": [dict(row) for row in repairs],
    }

    return json.loads(json.dumps(snapshot, default=_json_default))


async def insert_customer_ai_analysis(
    conn: asyncpg.Connection,
    customer_id: str,
    summary: str,
    risk_level: str | None,
    sales_potential: str | None,
    next_best_action: str | None,
    tags: list[str] | None,
    insights: dict[str, Any] | None,
    source: str,
    model_name: str,
) -> dict[str, Any]:
    new_id = str(uuid.uuid4())

    row = await conn.fetchrow(
        """
        INSERT INTO "CustomerAiAnalysis"
        (
          id,
          "customerId",
          summary,
          "riskLevel",
          "salesPotential",
          "nextBestAction",
          tags,
          insights,
          source,
          "modelName",
          "createdAt",
          "updatedAt"
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6,
          $7::jsonb, $8::jsonb, $9, $10, now(), now()
        )
        RETURNING *
        """,
        new_id,
        customer_id,
        summary,
        risk_level,
        sales_potential,
        next_best_action,
        json.dumps(tags or [], ensure_ascii=False),
        json.dumps(insights or {}, ensure_ascii=False),
        source,
        model_name,
    )

    return dict(row)


async def insert_customer_activity(
    conn: asyncpg.Connection,
    customer_id: str,
    title: str,
    body: str | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO "CustomerActivity"
        (
          id,
          "customerId",
          type,
          title,
          body,
          "createdAt",
          "updatedAt"
        )
        VALUES
        ($1, $2, 'AI_ANALYSIS_UPDATED', $3, $4, now(), now())
        """,
        str(uuid.uuid4()),
        customer_id,
        title,
        body,
    )