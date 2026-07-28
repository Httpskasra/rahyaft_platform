import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

import aio_pika
import asyncpg
from dotenv import load_dotenv

from crm.customer_ai_service import CustomerAiService

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

log = logging.getLogger("crm_ai_worker")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://user:pass@localhost:5672")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://app:app@localhost:5432/enterprise",
)

DOMAIN_EXCHANGE = os.getenv("DOMAIN_EXCHANGE", "domain_events")
CRM_QUEUE = os.getenv("CRM_QUEUE", "crm_ai_worker")

CUSTOMER_AI_EVENTS = {
    "customer.created",
    "customer.updated",
    "customer.contact.created",
    "customer.contact.updated",
    "customer.contact.deleted",
    "customer.sales_opportunity.created",
    "customer.sales_opportunity.updated",
    "customer.sales_opportunity.deleted",
    "customer.ai_analysis.requested",
}

pg_pool: asyncpg.Pool | None = None
customer_ai_service = CustomerAiService()


async def get_pool() -> asyncpg.Pool:
    global pg_pool

    if pg_pool is None:
        pg_pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            min_size=1,
            max_size=5,
        )
        log.info("PostgreSQL pool created")

    return pg_pool


def get_customer_id_from_event(event: dict[str, Any]) -> str | None:
    payload = event.get("payload") or {}
    customer_id = payload.get("customerId")

    if isinstance(customer_id, str) and customer_id.strip():
        return customer_id

    return None


async def process_customer_event(msg: aio_pika.IncomingMessage) -> None:
    async with msg.process(requeue=False):
        event: dict[str, Any] = {}

        try:
            event = json.loads(msg.body.decode("utf-8"))

            event_type = event.get("type")
            payload = event.get("payload") or {}

            if event_type not in CUSTOMER_AI_EVENTS:
                log.info("Skipping unsupported event type: %s", event_type)
                return

            customer_id = get_customer_id_from_event(event)

            if not customer_id:
                log.warning("Customer event has no customerId: %s", event)
                return

            extra_instruction = payload.get("extraInstruction")

            if extra_instruction is not None and not isinstance(extra_instruction, str):
                extra_instruction = None

            log.info(
                "Processing CRM AI event=%s customerId=%s",
                event_type,
                customer_id,
            )

            pool = await get_pool()

            async with pool.acquire() as conn:
                analysis = await customer_ai_service.generate_for_customer(
                    conn=conn,
                    customer_id=customer_id,
                    extra_instruction=extra_instruction,
                )

            log.info(
                "✅ Customer AI analysis created customerId=%s analysisId=%s",
                customer_id,
                analysis.get("id"),
            )

        except Exception as exc:
            log.exception(
                "❌ Error processing CRM event eventId=%s error=%s",
                event.get("eventId", "?"),
                exc,
            )
            raise


async def main() -> None:
    global pg_pool

    log.info("Starting CRM AI worker...")
    log.info("RabbitMQ URL: %s", RABBITMQ_URL)
    log.info("Database URL: %s", DATABASE_URL)
    log.info("Domain exchange: %s", DOMAIN_EXCHANGE)
    log.info("CRM queue: %s", CRM_QUEUE)

    connection = await aio_pika.connect_robust(RABBITMQ_URL)

    try:
        async with connection:
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=1)

            exchange = await channel.declare_exchange(
                DOMAIN_EXCHANGE,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )

            queue = await channel.declare_queue(
                CRM_QUEUE,
                durable=True,
                auto_delete=False,
            )

            await queue.bind(exchange, routing_key="customer.#")

            await queue.consume(process_customer_event)

            log.info("CRM AI worker ready — listening on queue '%s'...", CRM_QUEUE)

            await asyncio.Future()

    finally:
        if pg_pool is not None:
            await pg_pool.close()
            log.info("PostgreSQL pool closed")


if __name__ == "__main__":
    asyncio.run(main())