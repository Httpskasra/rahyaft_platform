"""
Analytics Worker — Main entry point.

Pipeline (runs on every new submission, updates all aggregates):
  1.  Fetch form schema + ALL historical submissions
  2.  Per-field rolling stats  → FormStat (rolling_stats)
  3.  Per-field NLP corpus     → FormAnalysis (nlp_corpus)   ← text/textarea only
  4.  Risk scoring (latest)    → FormAnalysis (risk_assessment)
  5.  Anomaly detection        → FormAnalysis (anomaly_detection)
  6.  Form category            → FormAnalysis (form_category)
  7.  Domain classification    → FormAnalysis (domain_classification)
  8.  Domain insights + KPIs   → FormAnalysis (domain_insights)
  9.  Completion health        → FormAnalysis (completion_health)
  10. Trend analysis           → FormAnalysis (trend_analysis)
  11. Predictions              → FormAnalysis (predictions)
  12. Submission history       → FormAnalysis (submission_history)
"""
import asyncio
import json
import logging
import os

import aio_pika
import asyncpg

from data_processing import clean_text
from nlp_analyzer import analyze_text_corpus
from prediction_models import (
    compute_field_stats,
    predict_risk_level,
    predict_form_category,
    detect_anomaly,
    compute_trend_analysis,
    compute_completion_health,
    generate_predictions,
    build_submission_history,
)
from domain_classifier import classify_domain, generate_domain_analysis
from database_handler import upsert_form_stat, upsert_form_analysis, get_all_field_values

# ─── Config ───────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("analytics.worker")

RABBIT_URL = os.getenv("RABBITMQ_URL", "amqp://user:pass@rabbitmq:5672/")
DB_URL = os.getenv("DATABASE_URL")
MAX_RETRIES = 5
RETRY_DELAY = 5

pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(dsn=DB_URL, min_size=1, max_size=5)
    return pool


# ─── Fetch all submissions ─────────────────────────────────────

async def _fetch_all_submissions(conn: asyncpg.Connection, form_id: str) -> list[dict]:
    """Return all submissions as [{id, createdAt, data}] ordered by date ASC."""
    rows = await conn.fetch(
        'SELECT id, "createdAt", data FROM "FormSubmission" WHERE "formId" = $1 ORDER BY "createdAt" ASC',
        form_id,
    )
    result = []
    for row in rows:
        raw = row["data"]
        data = json.loads(raw) if isinstance(raw, str) else (dict(raw) if raw else {})
        created = row["createdAt"]
        result.append({
            "id": row["id"],
            "createdAt": created.isoformat() if hasattr(created, "isoformat") else str(created),
            "data": data,
        })
    return result


# ─── Message handler ──────────────────────────────────────────

async def process_submission(msg: aio_pika.IncomingMessage) -> None:
    async with msg.process(requeue=True):
        event: dict = {}
        try:
            event = json.loads(msg.body.decode())
            form_id = event["formId"]
            submission_data = event["data"]  # latest submission payload

            log.info(f"Processing submission {event.get('id')} for form {form_id}")

            pg = await get_pool()
            async with pg.acquire() as conn:

                # ── 1. Fetch form ─────────────────────────────────────
                row = await conn.fetchrow(
                    'SELECT name, description, schema FROM "Form" WHERE id=$1', form_id
                )
                if not row:
                    log.warning(f"Form {form_id} not found — skipping")
                    return

                raw_schema = row["schema"]
                schema: dict = json.loads(raw_schema) if isinstance(raw_schema, str) else dict(raw_schema)
                fields: list[dict] = schema.get("fields", [])
                form_name: str = row["name"] or ""
                form_description: str = row["description"] or ""

                if not fields:
                    log.warning(f"Form {form_id} has no fields — skipping")
                    return

                # ── 2. Fetch ALL historical submissions ───────────────
                all_submissions = await _fetch_all_submissions(conn, form_id)
                all_data: list[dict] = [s["data"] for s in all_submissions]

                # ── 3. Per-field rolling stats ────────────────────────
                stats_by_field: dict[str, dict] = {}
                for field in fields:
                    fid = field.get("id")
                    ftype = field.get("type", "text")
                    if not fid:
                        continue
                    all_values = await get_all_field_values(conn, form_id, fid)
                    stats = compute_field_stats(all_values, ftype)
                    stats_by_field[fid] = stats
                    await upsert_form_stat(conn, form_id, fid, "rolling_stats", stats)

                # ── 4. NLP corpus per text/textarea field ─────────────
                for field in fields:
                    fid = field.get("id")
                    ftype = field.get("type", "text")
                    if ftype not in ("text", "textarea") or not fid:
                        continue
                    # Gather all responses for this field across all submissions
                    raw_texts = [
                        clean_text(str(d[fid]))
                        for d in all_data
                        if d.get(fid) and str(d.get(fid, "")).strip()
                    ]
                    corpus_result = analyze_text_corpus(raw_texts)
                    await upsert_form_analysis(conn, form_id, fid, "nlp_corpus", corpus_result)

                # ── 5. Risk scoring (latest submission) ───────────────
                risk = predict_risk_level(submission_data, schema)
                await upsert_form_analysis(conn, form_id, None, "risk_assessment", risk)

                # ── 6. Anomaly detection ──────────────────────────────
                hist_stats: dict = {
                    fid: stats_by_field[fid]
                    for field in fields
                    if (fid := field.get("id")) and field.get("type") == "number" and fid in stats_by_field
                }
                anomaly = detect_anomaly(submission_data, hist_stats, schema)
                await upsert_form_analysis(conn, form_id, None, "anomaly_detection", anomaly)

                # ── 7. Form category ──────────────────────────────────
                category = predict_form_category(schema)
                await upsert_form_analysis(conn, form_id, None, "form_category", {"category": category})

                # ── 8. Domain classification ──────────────────────────
                domain = classify_domain(form_name, form_description, fields)
                await upsert_form_analysis(conn, form_id, None, "domain_classification", {"domain": domain})

                # ── 9. Domain-specific insights ───────────────────────
                domain_insights = generate_domain_analysis(domain, fields, all_data, stats_by_field)
                await upsert_form_analysis(conn, form_id, None, "domain_insights", domain_insights)

                # ── 10. Completion health ─────────────────────────────
                completion = compute_completion_health(all_data, fields)
                await upsert_form_analysis(conn, form_id, None, "completion_health", completion)

                # ── 11. Trend analysis ────────────────────────────────
                trends = compute_trend_analysis(all_submissions, fields)
                await upsert_form_analysis(conn, form_id, None, "trend_analysis", trends)

                # ── 12. Predictions ───────────────────────────────────
                preds = generate_predictions(all_submissions, fields, stats_by_field)
                await upsert_form_analysis(conn, form_id, None, "predictions", preds)

                # ── 13. Per-submission history ────────────────────────
                history = build_submission_history(all_submissions, schema)
                await upsert_form_analysis(conn, form_id, None, "submission_history", history)

            log.info(
                f"✅ Done {event.get('id')} | domain={domain} "
                f"risk={risk['risk_level']} anomaly={anomaly['is_anomaly']} "
                f"trend={trends.get('volume_trend')} subs={len(all_submissions)}"
            )

        except Exception as exc:
            log.exception(f"❌ Error processing {event.get('id', '?')}: {exc}")
            raise  # triggers requeue


# ─── RabbitMQ main loop ───────────────────────────────────────

async def main() -> None:
    for attempt in range(MAX_RETRIES):
        try:
            conn = await aio_pika.connect_robust(RABBIT_URL)
            log.info("Connected to RabbitMQ")
            break
        except Exception as exc:
            log.warning(f"RabbitMQ not ready ({attempt + 1}/{MAX_RETRIES}): {exc}")
            if attempt + 1 == MAX_RETRIES:
                raise
            await asyncio.sleep(RETRY_DELAY)

    channel = await conn.channel()
    await channel.set_qos(prefetch_count=1)

    exchange = await channel.declare_exchange(
        "form_submissions", aio_pika.ExchangeType.FANOUT, durable=True
    )
    queue = await channel.declare_queue(
        "analytics_worker", durable=True, auto_delete=False
    )
    await queue.bind(exchange)

    log.info("Analytics worker ready — listening on 'analytics_worker'…")
    await queue.consume(process_submission)
    await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Worker stopped")
