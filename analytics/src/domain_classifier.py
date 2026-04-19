"""
Domain classifier for forms.

Detects the business domain of a form based on field labels, form name,
and description — then generates domain-specific KPIs, warnings,
recommendations, and predictions tailored to that domain.

Supported domains:
  hr          — recruitment, performance review, employee satisfaction
  product     — product feedback, feature requests, NPS
  survey      — general surveys, research, opinion polls
  support     — customer support tickets, bug reports
  finance     — expense claims, budget requests, invoices
  operations  — process checklists, facility reports, logistics
  unknown     — fallback for anything that doesn't match
"""

import re
import statistics
from typing import Any


# ─── Keyword Banks ────────────────────────────────────────────
_DOMAIN_KEYWORDS: dict[str, set[str]] = {
    "hr": {
        # English
        "employee", "staff", "hire", "hiring", "onboard", "performance",
        "review", "appraisal", "salary", "payroll", "leave", "vacation",
        "attendance", "department", "position", "role", "candidate",
        "interview", "recruitment", "resignation", "termination", "hr",
        "human resources", "job", "manager", "subordinate", "team",
        # Persian
        "کارمند", "استخدام", "حقوق", "مرخصی", "عملکرد", "ارزیابی",
        "منابع انسانی", "نیروی کار", "پرسنل", "مدیر", "تیم", "واحد",
        "ترفیع", "پست", "سمت",
    },
    "product": {
        # English
        "product", "feature", "bug", "feedback", "nps", "satisfaction",
        "rating", "review", "usability", "ux", "ui", "experience",
        "recommend", "price", "purchase", "order", "delivery", "quality",
        "defect", "issue", "improvement", "version", "release", "customer",
        # Persian
        "محصول", "بازخورد", "رضایت", "امتیاز", "کیفیت", "سفارش",
        "تحویل", "خرید", "قیمت", "ویژگی", "پیشنهاد", "مشکل", "باگ",
        "تجربه کاربری", "بهبود",
    },
    "survey": {
        # English
        "survey", "opinion", "poll", "vote", "preference", "choice",
        "agree", "disagree", "scale", "rate", "score", "question",
        "research", "study", "questionnaire", "demographic", "age",
        "gender", "education", "income",
        # Persian
        "نظرسنجی", "نظر", "رای", "پرسشنامه", "ترجیح", "انتخاب",
        "موافق", "مخالف", "سن", "جنسیت", "تحصیلات",
    },
    "support": {
        # English
        "ticket", "support", "issue", "problem", "error", "complaint",
        "request", "help", "incident", "priority", "urgent", "resolve",
        "status", "case", "report", "customer service", "technical",
        # Persian
        "تیکت", "پشتیبانی", "مشکل", "خطا", "شکایت", "درخواست",
        "اضطراری", "فوری", "وضعیت", "گزارش", "رفع",
    },
    "finance": {
        # English
        "expense", "budget", "invoice", "payment", "cost", "amount",
        "total", "tax", "receipt", "reimbursement", "purchase", "vendor",
        "contract", "financial", "accounting", "project code",
        # Persian
        "هزینه", "بودجه", "فاکتور", "پرداخت", "مبلغ", "مالیات",
        "رسید", "بازپرداخت", "خرید", "فروشنده", "قرارداد", "حسابداری",
    },
    "operations": {
        # English
        "checklist", "inspection", "facility", "equipment", "maintenance",
        "inventory", "warehouse", "logistics", "process", "procedure",
        "audit", "compliance", "safety", "health", "quality control",
        # Persian
        "چک‌لیست", "بازرسی", "تجهیزات", "نگهداری", "انبار", "لجستیک",
        "فرایند", "رویه", "حسابرسی", "انطباق", "ایمنی", "کنترل کیفیت",
    },
}


def _tokenize(text: str) -> set[str]:
    """Lowercase + split on non-word characters."""
    if not text:
        return set()
    return set(re.findall(r"[\w\u0600-\u06FF]+", text.lower()))


def classify_domain(form_name: str, form_description: str, fields: list[dict]) -> str:
    """
    Return the most likely domain string.
    Scores each domain by keyword hits across name, description, and field labels.
    """
    corpus = " ".join([
        form_name or "",
        form_description or "",
        " ".join(f.get("label", "") for f in fields),
        " ".join(f.get("description", "") for f in fields),
    ])
    tokens = _tokenize(corpus)

    scores: dict[str, int] = {}
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        hits = 0
        for kw in keywords:
            if " " in kw:  # phrase match
                if kw in corpus.lower():
                    hits += 2
            else:
                if kw in tokens:
                    hits += 1
        scores[domain] = hits

    best = max(scores, key=lambda d: scores[d])
    return best if scores[best] > 0 else "unknown"


# ─── Domain-specific insight generators ───────────────────────

def _hr_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    """Generate HR-specific KPIs, warnings, recommendations."""
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    # Look for rating/score fields (performance indicators)
    rating_fields = [f for f in fields if f.get("type") == "number"]
    for rf in rating_fields:
        fid = rf["id"]
        s = stats_by_field.get(fid, {})
        avg = s.get("avg")
        if avg is not None:
            label = rf.get("label", fid)
            kpis[f"avg_{fid}"] = {"label": f"میانگین {label}", "value": round(avg, 2)}
            if avg < 3:
                warnings.append({
                    "severity": "high",
                    "field": label,
                    "message": f"میانگین امتیاز «{label}» پایین است ({avg:.1f}). نیاز به بررسی فوری دارد.",
                })
            elif avg >= 4.5:
                insights.append({
                    "type": "positive",
                    "message": f"«{label}» امتیاز عالی دارد ({avg:.1f}/5). این حوزه قوت تیم است.",
                })

    # Look for select/radio fields — common choices tell HR about trends
    choice_fields = [f for f in fields if f.get("type") in ("select", "radio", "checkbox")]
    for cf in choice_fields:
        fid = cf["id"]
        s = stats_by_field.get(fid, {})
        top = s.get("top")
        top_freq = s.get("top_freq", 0)
        count = s.get("count", 1)
        if top and count > 0:
            pct = round(top_freq / count * 100)
            label = cf.get("label", fid)
            if pct > 60:
                insights.append({
                    "type": "neutral",
                    "message": f"{pct}٪ از پاسخ‌دهندگان در «{label}» گزینه «{top}» را انتخاب کرده‌اند.",
                })

    # Low completion of required fields = data quality risk
    low_fill_fields = []
    for f in fields:
        if f.get("required"):
            s = stats_by_field.get(f["id"], {})
            cnt = s.get("count", 0)
            total = len(all_submissions)
            if total > 0 and cnt / total < 0.7:
                low_fill_fields.append(f.get("label", f["id"]))

    if low_fill_fields:
        warnings.append({
            "severity": "medium",
            "field": ", ".join(low_fill_fields),
            "message": f"فیلدهای الزامی «{', '.join(low_fill_fields)}» کمتر از ۷۰٪ تکمیل شده‌اند. داده‌ها ناقص هستند.",
        })

    recommendations.append({
        "priority": "high",
        "action": "بهترین کارمند",
        "detail": "فیلدهای عددی را با هم ترکیب کنید تا بالاترین امتیازها را شناسایی کنید.",
    })
    recommendations.append({
        "priority": "medium",
        "action": "تحلیل گپ مهارتی",
        "detail": "پاسخ‌های متنی را برای شناسایی مهارت‌های مشترک مورد نیاز بررسی کنید.",
    })

    return {
        "domain": "hr",
        "domain_label": "منابع انسانی",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _product_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    # NPS / rating fields
    for f in fields:
        if f.get("type") == "number":
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            avg = s.get("avg")
            mn = s.get("min")
            mx = s.get("max")
            if avg is not None:
                label = f.get("label", fid)
                kpis[f"avg_{fid}"] = {"label": f"میانگین {label}", "value": round(avg, 2)}
                kpis[f"range_{fid}"] = {"label": f"بازه {label}", "value": f"{mn}–{mx}"}

                if avg >= 8:
                    insights.append({"type": "positive", "message": f"امتیاز «{label}» بسیار مثبت است ({avg:.1f}). محصول در این جنبه قوی است."})
                elif avg < 5:
                    warnings.append({"severity": "high", "field": label, "message": f"امتیاز «{label}» پایین است ({avg:.1f}). ریسک از دست دادن مشتری وجود دارد."})

    # Choice distribution for feature preferences
    for f in fields:
        if f.get("type") in ("select", "radio", "checkbox"):
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            top = s.get("top")
            count = s.get("count", 1)
            top_freq = s.get("top_freq", 0)
            if top:
                pct = round(top_freq / count * 100) if count else 0
                insights.append({"type": "neutral", "message": f"{pct}٪ از مشتریان «{top}» را در فیلد «{f.get('label', fid)}» انتخاب کرده‌اند."})

    recommendations.extend([
        {"priority": "high", "action": "بهبود ویژگی‌های ضعیف", "detail": "فیلدهایی با امتیاز پایین را اولویت‌بندی کنید و نقشه راه محصول را به‌روز کنید."},
        {"priority": "medium", "action": "تحلیل دسته‌بندی مشتریان", "detail": "پاسخ‌دهندگان را بر اساس امتیاز NPS به Promoter، Passive، Detractor دسته‌بندی کنید."},
        {"priority": "low", "action": "پیگیری منتقدان", "detail": "کاربرانی که امتیاز زیر ۶ داده‌اند را برای مکالمه عمیق‌تر دنبال کنید."},
    ])

    return {
        "domain": "product",
        "domain_label": "بازخورد محصول",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _survey_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    total = len(all_submissions)
    kpis["response_count"] = {"label": "کل پاسخ‌ها", "value": total}

    # Completion rate per field
    low_fill = []
    for f in fields:
        fid = f["id"]
        s = stats_by_field.get(fid, {})
        cnt = s.get("count", 0)
        rate = cnt / total if total else 0
        if rate < 0.5:
            low_fill.append(f.get("label", fid))

    if low_fill:
        warnings.append({"severity": "medium", "field": ", ".join(low_fill), "message": f"سوال‌های «{', '.join(low_fill)}» نرخ پاسخ پایینی دارند. ممکن است مبهم یا حساس باشند."})

    # Most popular choices
    for f in fields:
        if f.get("type") in ("select", "radio"):
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            top = s.get("top")
            if top:
                insights.append({"type": "neutral", "message": f"محبوب‌ترین پاسخ برای «{f.get('label', fid)}»: «{top}»"})

    recommendations.extend([
        {"priority": "high", "action": "افزایش نرخ پاسخ", "detail": "سوالات با نرخ پایین را کوتاه‌تر یا اختیاری کنید."},
        {"priority": "medium", "action": "تحلیل بخش‌بندی", "detail": "پاسخ‌ها را بر اساس متغیرهای جمعیتی تقسیم‌بندی کنید."},
    ])

    return {
        "domain": "survey",
        "domain_label": "نظرسنجی",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _support_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    total = len(all_submissions)
    kpis["ticket_count"] = {"label": "تعداد تیکت‌ها", "value": total}

    # Priority distribution
    for f in fields:
        if any(kw in f.get("label", "").lower() for kw in ["priority", "اولویت", "urgent", "فوری"]):
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            top = s.get("top")
            if top:
                insights.append({"type": "neutral", "message": f"رایج‌ترین سطح اولویت: «{top}»"})

    # Volume warning
    if total > 50:
        warnings.append({"severity": "medium", "field": "حجم تیکت", "message": f"{total} تیکت باز وجود دارد. ظرفیت تیم پشتیبانی را بررسی کنید."})

    recommendations.extend([
        {"priority": "high", "action": "اتوماسیون پاسخ‌های تکراری", "detail": "تیکت‌های مشابه را شناسایی و با پاسخ‌های آماده مدیریت کنید."},
        {"priority": "medium", "action": "تحلیل SLA", "detail": "زمان پاسخ و وضعیت حل تیکت‌ها را رصد کنید."},
    ])

    return {
        "domain": "support",
        "domain_label": "پشتیبانی مشتری",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _finance_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    # Sum numeric (amount) fields
    for f in fields:
        if f.get("type") == "number":
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            avg = s.get("avg")
            total_approx = (avg or 0) * len(all_submissions)
            label = f.get("label", fid)
            kpis[f"total_{fid}"] = {"label": f"مجموع تقریبی {label}", "value": round(total_approx, 2)}
            kpis[f"avg_{fid}"] = {"label": f"میانگین {label}", "value": round(avg, 2) if avg else 0}

            if avg and s.get("max") and s["max"] > avg * 3:
                warnings.append({"severity": "high", "field": label, "message": f"مقادیر بزرگ‌تر از ۳× میانگین در «{label}» وجود دارد. نیاز به تایید مدیریت دارد."})

    recommendations.extend([
        {"priority": "high", "action": "بررسی تراکنش‌های بزرگ", "detail": "هرگونه مبلغ بالاتر از آستانه تعریف‌شده باید تایید دوطرفه داشته باشد."},
        {"priority": "medium", "action": "گزارش ماهانه هزینه", "detail": "داده‌های این فرم را با سیستم حسابداری یکپارچه کنید."},
    ])

    return {
        "domain": "finance",
        "domain_label": "مالی / هزینه",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _operations_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    insights = []
    warnings = []
    recommendations = []
    kpis = {}

    total = len(all_submissions)
    kpis["inspection_count"] = {"label": "تعداد بازرسی‌ها", "value": total}

    # Checkbox compliance: if most are False, it's a red flag
    for f in fields:
        if f.get("type") == "checkbox" and not f.get("options"):
            fid = f["id"]
            true_count = sum(1 for s in all_submissions if s.get(fid) is True)
            rate = true_count / total if total else 0
            label = f.get("label", fid)
            if rate < 0.5:
                warnings.append({"severity": "high", "field": label, "message": f"تنها {round(rate*100)}٪ از بازرسی‌ها «{label}» را تایید کرده‌اند. مشکل انطباق جدی است."})
            else:
                insights.append({"type": "positive", "message": f"{round(rate*100)}٪ انطباق برای «{label}»"})

    recommendations.extend([
        {"priority": "high", "action": "پیگیری موارد ناقص", "detail": "موارد چک‌لیست که تایید نشده‌اند باید بلافاصله پیگیری شوند."},
        {"priority": "medium", "action": "گزارش روند", "detail": "نرخ انطباق را در طول زمان رصد کنید تا روند بهبود یا تنزل مشخص شود."},
    ])

    return {
        "domain": "operations",
        "domain_label": "عملیات / بازرسی",
        "kpis": kpis,
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,
    }


def _unknown_insights(fields: list[dict], all_submissions: list[dict], stats_by_field: dict) -> dict:
    return {
        "domain": "unknown",
        "domain_label": "عمومی",
        "kpis": {"response_count": {"label": "کل پاسخ‌ها", "value": len(all_submissions)}},
        "insights": [{"type": "neutral", "message": "این فرم در دسته‌بندی شناخته‌شده‌ای قرار نمی‌گیرد. داده‌های بیشتر دقت را افزایش می‌دهند."}],
        "warnings": [],
        "recommendations": [{"priority": "low", "action": "برچسب‌گذاری فرم", "detail": "نام و توضیح فرم را واضح‌تر کنید تا تحلیل‌های دقیق‌تری دریافت شود."}],
    }


_DOMAIN_FN = {
    "hr": _hr_insights,
    "product": _product_insights,
    "survey": _survey_insights,
    "support": _support_insights,
    "finance": _finance_insights,
    "operations": _operations_insights,
}


def generate_domain_analysis(
    domain: str,
    fields: list[dict],
    all_submissions: list[dict],
    stats_by_field: dict,
) -> dict:
    """
    Given a domain string and submission data, generate domain-specific analysis.
    stats_by_field: { field_id: { avg, min, max, std, count, unique, top, top_freq } }
    all_submissions: list of raw data dicts (just the data payload, not full submission)
    """
    fn = _DOMAIN_FN.get(domain, _unknown_insights)
    return fn(fields, all_submissions, stats_by_field)
