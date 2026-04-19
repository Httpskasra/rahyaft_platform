"""
Rule-based and statistical models for form analysis.
No ML training needed — works from day one with any data.
Extended with: trend analysis, predictions, choice distributions,
completion health, and per-submission risk history.
"""
import statistics
from collections import defaultdict
from datetime import datetime
from typing import Any


# ─── Rolling field stats ───────────────────────────────────────

def compute_field_stats(values: list[Any], field_type: str) -> dict:
    """Compute rolling stats for a single field across all submissions."""
    if field_type == "number":
        nums = [float(v) for v in values if v is not None and _is_number(v)]
        if not nums:
            return {"count": 0, "avg": None, "min": None, "max": None, "std": None, "median": None, "p25": None, "p75": None}
        return {
            "count": len(nums),
            "avg": round(statistics.mean(nums), 4),
            "median": round(statistics.median(nums), 4),
            "min": round(min(nums), 4),
            "max": round(max(nums), 4),
            "std": round(statistics.stdev(nums), 4) if len(nums) > 1 else 0,
            "p25": round(_percentile(nums, 25), 4),
            "p75": round(_percentile(nums, 75), 4),
        }
    elif field_type in ("select", "radio"):
        str_vals = [str(v) for v in values if v is not None and str(v).strip()]
        if not str_vals:
            return {"count": 0, "unique": 0, "top": None, "top_freq": 0, "distribution": {}}
        freq: dict[str, int] = {}
        for v in str_vals:
            freq[v] = freq.get(v, 0) + 1
        top = max(freq, key=lambda x: freq[x])
        return {
            "count": len(str_vals),
            "unique": len(freq),
            "top": top,
            "top_freq": freq[top],
            "distribution": dict(sorted(freq.items(), key=lambda x: -x[1])),
        }
    elif field_type == "checkbox":
        all_items: list[str] = []
        bool_true = 0
        bool_total = 0
        for v in values:
            if isinstance(v, list):
                all_items.extend([str(i) for i in v if i is not None])
            elif isinstance(v, bool):
                bool_total += 1
                if v:
                    bool_true += 1
            elif v is not None:
                bool_total += 1
                if str(v).lower() in ("true", "1", "yes"):
                    bool_true += 1
        if all_items:
            freq2: dict[str, int] = {}
            for item in all_items:
                freq2[item] = freq2.get(item, 0) + 1
            top2 = max(freq2, key=lambda x: freq2[x])
            return {
                "count": len(values),
                "unique": len(freq2),
                "top": top2,
                "top_freq": freq2[top2],
                "distribution": dict(sorted(freq2.items(), key=lambda x: -x[1])),
            }
        else:
            return {
                "count": bool_total,
                "true_count": bool_true,
                "false_count": bool_total - bool_true,
                "true_rate": round(bool_true / bool_total, 4) if bool_total else 0,
            }
    else:
        str_vals = [str(v) for v in values if v is not None and str(v).strip()]
        if not str_vals:
            return {"count": 0, "unique": 0, "top": None, "top_freq": 0, "avg_length": 0}
        freq3: dict[str, int] = {}
        for v in str_vals:
            freq3[v] = freq3.get(v, 0) + 1
        top3 = max(freq3, key=lambda x: freq3[x])
        return {
            "count": len(str_vals),
            "unique": len(freq3),
            "top": top3,
            "top_freq": freq3[top3],
            "avg_length": round(statistics.mean(len(v) for v in str_vals), 1),
        }


# ─── Risk scoring ──────────────────────────────────────────────

def predict_risk_level(submission_data: dict, schema: dict) -> dict:
    reasons = []
    passed = []
    score = 0
    fields = schema.get("fields", [])

    missing_required = [
        f["label"] for f in fields
        if f.get("required") and not submission_data.get(f.get("id"))
    ]
    if missing_required:
        score += 30 * len(missing_required)
        reasons.append(f"فیلدهای الزامی تکمیل نشده: {', '.join(missing_required)}")
    else:
        passed.append("تمام فیلدهای الزامی تکمیل شده‌اند")

    short_text_fields = []
    for field in fields:
        fid = field.get("id")
        ftype = field.get("type", "text")
        val = submission_data.get(fid)
        if ftype in ("text", "textarea") and val and len(str(val).strip()) < 3 and field.get("required"):
            score += 15
            short_text_fields.append(field.get("label", fid))
    if short_text_fields:
        reasons.append(f"پاسخ بسیار کوتاه در: {', '.join(short_text_fields)}")
    elif any(f.get("type") in ("text", "textarea") for f in fields):
        passed.append("پاسخ‌های متنی با طول کافی")

    negative_fields = []
    for field in fields:
        if field.get("type") == "number":
            fid = field.get("id")
            val = submission_data.get(fid)
            if val is not None:
                n = _to_float(val)
                if n is not None and n < 0:
                    score += 10
                    negative_fields.append(field.get("label", fid))
    if negative_fields:
        reasons.append(f"مقادیر منفی در: {', '.join(negative_fields)}")

    answered = sum(1 for f in fields if submission_data.get(f.get("id")) is not None)
    if answered == len(fields) and len(fields) > 0:
        passed.append("همه فیلدها پاسخ داده شده‌اند")

    score = min(score, 100)
    risk = "low" if score < 20 else "medium" if score < 50 else "high"
    return {"risk_level": risk, "risk_score": score, "reasons": reasons, "passed_checks": passed}


# ─── Form category ────────────────────────────────────────────

def predict_form_category(schema: dict) -> str:
    fields = schema.get("fields", [])
    if not fields:
        return "unknown"
    total = len(fields)
    num_r = sum(1 for f in fields if f.get("type") == "number") / total
    txt_r = sum(1 for f in fields if f.get("type") in ("text", "textarea")) / total
    choice_r = sum(1 for f in fields if f.get("type") in ("select", "radio", "checkbox")) / total
    if num_r > 0.7:
        return "quantitative"
    elif txt_r > 0.6:
        return "qualitative"
    elif choice_r > 0.5:
        return "choice_based"
    else:
        return "mixed"


# ─── Anomaly detection ────────────────────────────────────────

def detect_anomaly(submission_data: dict, historical_stats: dict, schema: dict) -> dict:
    anomalous_fields = []
    z_scores = []
    for field in schema.get("fields", []):
        fid = field.get("id")
        if field.get("type") != "number":
            continue
        val = _to_float(submission_data.get(fid))
        if val is None:
            continue
        hist = historical_stats.get(fid, {})
        avg = hist.get("avg")
        std = hist.get("std")
        if avg is not None and std is not None and std > 0:
            z = abs((val - avg) / std)
            z_scores.append(z)
            if z > 2.5:
                anomalous_fields.append({
                    "field": field.get("label", fid),
                    "value": val,
                    "expected_range": [round(avg - 2 * std, 2), round(avg + 2 * std, 2)],
                    "z_score": round(z, 2),
                    "severity": "high" if z > 3 else "medium",
                })
    anomaly_score = max(z_scores) if z_scores else 0
    return {
        "is_anomaly": anomaly_score > 2.5,
        "anomaly_score": round(anomaly_score, 3),
        "anomalous_fields": anomalous_fields,
    }


# ─── Trend analysis ───────────────────────────────────────────

def compute_trend_analysis(submissions_with_dates: list[dict], fields: list[dict]) -> dict:
    if not submissions_with_dates:
        return {"volume_trend": "no_data", "trend_pct": None, "weekly_counts": [], "field_trends": {}}

    sorted_subs = sorted(submissions_with_dates, key=lambda s: s["createdAt"])
    week_counts: dict[str, int] = defaultdict(int)
    for sub in sorted_subs:
        try:
            dt = datetime.fromisoformat(sub["createdAt"].replace("Z", "+00:00"))
            wk = f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"
            week_counts[wk] += 1
        except Exception:
            pass

    sorted_weeks = sorted(week_counts.items())
    weekly_counts = [{"week": k, "count": v} for k, v in sorted_weeks[-8:]]
    counts = [w["count"] for w in weekly_counts]

    if len(counts) >= 4:
        recent = sum(counts[-2:])
        older = sum(counts[-4:-2])
        if older == 0:
            vol_trend, trend_pct = "up", None
        else:
            pct = (recent - older) / older * 100
            vol_trend = "up" if pct > 10 else "down" if pct < -10 else "flat"
            trend_pct = round(pct, 1)
    else:
        vol_trend, trend_pct = "insufficient_data", None

    field_trends: dict[str, list] = {}
    for field in fields:
        if field.get("type") != "number":
            continue
        fid = field["id"]
        week_vals: dict[str, list] = defaultdict(list)
        for sub in sorted_subs:
            try:
                dt = datetime.fromisoformat(sub["createdAt"].replace("Z", "+00:00"))
                wk = f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"
                v = _to_float(sub["data"].get(fid))
                if v is not None:
                    week_vals[wk].append(v)
            except Exception:
                pass
        trend_points = [
            {"week": wk, "avg": round(statistics.mean(week_vals[wk]), 2), "count": len(week_vals[wk])}
            for wk in sorted(week_vals)[-8:]
        ]
        if trend_points:
            field_trends[fid] = trend_points

    return {"volume_trend": vol_trend, "trend_pct": trend_pct, "weekly_counts": weekly_counts, "field_trends": field_trends}


# ─── Completion health ────────────────────────────────────────

def compute_completion_health(submissions: list[dict], fields: list[dict]) -> dict:
    if not submissions or not fields:
        return {"overall_score": 0, "field_health": []}
    total = len(submissions)
    field_health = []
    for f in fields:
        fid = f["id"]
        filled = sum(1 for s in submissions if s.get(fid) not in (None, "", []))
        rate = round(filled / total * 100, 1)
        status = "excellent" if rate >= 90 else "good" if rate >= 70 else "warning" if rate >= 50 else "critical"
        field_health.append({
            "field_id": fid,
            "label": f.get("label", fid),
            "required": f.get("required", False),
            "fill_rate": rate,
            "filled": filled,
            "missing": total - filled,
            "status": status,
        })
    req = [fh["fill_rate"] for fh in field_health if fh["required"]]
    opt = [fh["fill_rate"] for fh in field_health if not fh["required"]]
    if req and opt:
        overall = statistics.mean(req) * 0.7 + statistics.mean(opt) * 0.3
    elif req:
        overall = statistics.mean(req)
    elif opt:
        overall = statistics.mean(opt)
    else:
        overall = 0
    return {"overall_score": round(overall, 1), "field_health": sorted(field_health, key=lambda x: x["fill_rate"])}


# ─── Predictions ──────────────────────────────────────────────

def generate_predictions(submissions_with_dates: list[dict], fields: list[dict], stats_by_field: dict) -> dict:
    predictions: dict = {}
    week_counts: dict[str, int] = defaultdict(int)
    for sub in submissions_with_dates:
        try:
            dt = datetime.fromisoformat(sub["createdAt"].replace("Z", "+00:00"))
            wk = f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"
            week_counts[wk] += 1
        except Exception:
            pass
    sorted_counts = [v for _, v in sorted(week_counts.items())]
    if len(sorted_counts) >= 2:
        last_4 = sorted_counts[-4:]
        predictions["next_week_volume"] = {
            "value": round(statistics.mean(last_4)),
            "confidence": "medium" if len(sorted_counts) >= 4 else "low",
            "basis": f"میانگین {len(last_4)} هفته اخیر",
        }
    field_preds: dict[str, dict] = {}
    for f in fields:
        if f.get("type") == "number":
            fid = f["id"]
            s = stats_by_field.get(fid, {})
            avg = s.get("avg")
            std = s.get("std", 0) or 0
            if avg is not None:
                field_preds[fid] = {
                    "label": f.get("label", fid),
                    "predicted_avg": avg,
                    "confidence_interval": [round(avg - 1.96 * std, 2), round(avg + 1.96 * std, 2)],
                }
    if field_preds:
        predictions["field_predictions"] = field_preds
    return predictions


# ─── Per-submission history ───────────────────────────────────

def build_submission_history(submissions_with_dates: list[dict], schema: dict) -> list[dict]:
    fields = schema.get("fields", [])
    history = []
    for sub in submissions_with_dates:
        risk = predict_risk_level(sub["data"], schema)
        answered = sum(1 for f in fields if sub["data"].get(f.get("id")) is not None)
        completion_pct = round(answered / len(fields) * 100) if fields else 100
        history.append({
            "id": sub.get("id", ""),
            "createdAt": sub["createdAt"],
            "risk_score": risk["risk_score"],
            "risk_level": risk["risk_level"],
            "completion_pct": completion_pct,
        })
    return history


# ─── Helpers ─────────────────────────────────────────────────

def _percentile(data: list[float], pct: float) -> float:
    if not data:
        return 0.0
    sd = sorted(data)
    idx = (pct / 100) * (len(sd) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(sd) - 1)
    return sd[lo] * (1 - (idx - lo)) + sd[hi] * (idx - lo)


def _is_number(v: Any) -> bool:
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False


def _to_float(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
