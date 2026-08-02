import logging
import os
from typing import Any

import asyncpg

from crm.customer_prompt import build_customer_analysis_prompt
from crm.customer_repository import (
    fetch_customer_snapshot,
    insert_customer_activity,
    insert_customer_ai_analysis,
)
from llm.json_parser import ensure_dict, normalize_level, normalize_tags
from llm.ollama_client import OllamaClient

log = logging.getLogger("customer_ai_service")


class CustomerAiService:
    def __init__(self) -> None:
        self.llm = OllamaClient()
        self.model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    def _pick_string(
        self,
        data: dict[str, Any],
        keys: list[str],
    ) -> str | None:
        for key in keys:
            value = data.get(key)

            if isinstance(value, str) and value.strip():
                return value.strip()

        return None

    def _build_fallback_summary(self, snapshot: dict[str, Any]) -> str:
        customer = snapshot.get("customer") or {}
        sales = snapshot.get("salesOpportunities") or []
        contacts = snapshot.get("contacts") or []
        repairs = snapshot.get("repairs") or []

        customer_type = customer.get("type")
        org_name = customer.get("organizationName")
        first_name = customer.get("firstName")
        last_name = customer.get("lastName")

        name = org_name or f"{first_name or ''} {last_name or ''}".strip() or "این مشتری"

        parts: list[str] = []

        if customer_type == "ORGANIZATION":
            parts.append(f"{name} یک مشتری سازمانی است.")
        else:
            parts.append(f"{name} یک مشتری حقیقی است.")

        if sales:
            parts.append(f"{len(sales)} فرصت فروش برای این مشتری ثبت شده است.")

        if contacts:
            parts.append(f"{len(contacts)} مخاطب برای پیگیری ارتباطات وجود دارد.")

        if not repairs:
            parts.append("پرونده تعمیراتی فعالی برای این مشتری ثبت نشده است.")

        return " ".join(parts)

    def _infer_sales_potential(self, snapshot: dict[str, Any]) -> str:
        sales = snapshot.get("salesOpportunities") or []

        for item in sales:
            priority = item.get("priority")
            probability = item.get("probability") or 0
            status = item.get("status")

            if priority in ("HIGH", "URGENT") or probability >= 70:
                return "HIGH"

            if status in ("NEEDS_QUOTE", "QUOTED", "NEGOTIATION"):
                return "HIGH"

        if sales:
            return "MEDIUM"

        return "LOW"

    def _infer_risk_level(self, snapshot: dict[str, Any]) -> str:
        customer = snapshot.get("customer") or {}
        status = customer.get("status")

        if status == "BLACKLISTED":
            return "HIGH"

        if status == "INACTIVE":
            return "MEDIUM"

        return "LOW"

    def _build_fallback_next_action(self, snapshot: dict[str, Any]) -> str:
        sales = snapshot.get("salesOpportunities") or []
        contacts = snapshot.get("contacts") or []

        primary_contact = None
        for contact in contacts:
            if contact.get("isPrimary"):
                primary_contact = contact
                break

        contact_name = (
            primary_contact.get("fullName")
            if isinstance(primary_contact, dict)
            else None
        )

        if sales:
            return (
                f"پیگیری فرصت فروش فعال و تماس با {contact_name} برای تعیین وضعیت تصمیم‌گیری."
                if contact_name
                else "پیگیری فرصت فروش فعال و بررسی وضعیت تصمیم‌گیری مشتری."
            )

        return (
            f"تماس با {contact_name} برای بررسی نیازهای جدید مشتری."
            if contact_name
            else "تماس با مشتری برای بررسی نیازهای جدید و ثبت پیگیری بعدی."
        )

    async def generate_for_customer(
        self,
        conn: asyncpg.Connection,
        customer_id: str,
        extra_instruction: str | None = None,
    ) -> dict[str, Any]:
        snapshot = await fetch_customer_snapshot(conn, customer_id)

        if not snapshot:
            raise ValueError(f"Customer not found: {customer_id}")

        prompt = build_customer_analysis_prompt(
            snapshot=snapshot,
            extra_instruction=extra_instruction,
        )

        model_result = await self.llm.generate_json(prompt)

        log.info("Model parsed result for customer %s: %s", customer_id, model_result)

        summary = self._pick_string(
            model_result,
            ["summary", "Summary", "خلاصه", "analysis", "تحلیل"],
        )

        if not summary:
            summary = self._build_fallback_summary(snapshot)

        risk_level = normalize_level(
            model_result.get("riskLevel")
            or model_result.get("risk_level")
            or model_result.get("risk")
        )

        if not risk_level:
            risk_level = self._infer_risk_level(snapshot)

        sales_potential = normalize_level(
            model_result.get("salesPotential")
            or model_result.get("sales_potential")
            or model_result.get("potential")
        )

        if not sales_potential:
            sales_potential = self._infer_sales_potential(snapshot)

        next_best_action = self._pick_string(
            model_result,
            [
                "nextBestAction",
                "next_best_action",
                "nextAction",
                "action",
                "اقدام بعدی",
            ],
        )

        if not next_best_action:
            next_best_action = self._build_fallback_next_action(snapshot)

        tags = normalize_tags(model_result.get("tags") or model_result.get("برچسب‌ها"))

        if not tags:
            tags = ["مشتری سازمانی", "CRM", "نیازمند پیگیری"]

        insights = ensure_dict(model_result.get("insights"))

        if not insights or insights == {"raw": None}:
            insights = {
                "repairAnalysis": "پرونده تعمیراتی فعالی برای این مشتری ثبت نشده است.",
                "salesAnalysis": "بر اساس فرصت‌های فروش موجود، مشتری نیازمند پیگیری فروش است.",
                "communicationAnalysis": "مخاطبین ثبت‌شده باید برای پیگیری ارتباطات استفاده شوند.",
                "followUpAnalysis": next_best_action,
            }

        analysis = await insert_customer_ai_analysis(
            conn=conn,
            customer_id=customer_id,
            summary=summary,
            risk_level=risk_level,
            sales_potential=sales_potential,
            next_best_action=next_best_action,
            tags=tags,
            insights=insights,
            source="analytics-worker",
            model_name=self.model_name,
        )

        await insert_customer_activity(
            conn=conn,
            customer_id=customer_id,
            title="تحلیل هوش مصنوعی بروزرسانی شد",
            body=(
                f"اقدام پیشنهادی بعدی: {next_best_action}"
                if next_best_action
                else "تحلیل جدید برای مشتری ثبت شد."
            ),
        )

        return analysis