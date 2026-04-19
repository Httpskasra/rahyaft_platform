"""
NLP analysis: keyword extraction, sentiment, corpus aggregation.

Two modes:
  analyze_text_field(text)         — single response analysis (stored per submission)
  analyze_text_corpus(texts)       — aggregate analysis across ALL responses for a field
                                     (sentiment distribution, top keywords, trend)
"""
import re
import statistics
from typing import Any


# ─── Word banks (English + Persian, easily extensible) ────────

POSITIVE_WORDS = {
    "good", "great", "excellent", "perfect", "happy", "satisfied",
    "wonderful", "amazing", "love", "best", "awesome", "helpful",
    "fast", "easy", "clear", "professional", "recommend", "quality",
    "خوب", "عالی", "ممنون", "راضی", "بهترین", "مفید", "سریع",
    "آسان", "واضح", "حرفه‌ای", "پیشنهاد", "کیفیت", "محبت",
}

NEGATIVE_WORDS = {
    "bad", "poor", "terrible", "problem", "error", "broken",
    "slow", "hard", "difficult", "confusing", "wrong", "fail",
    "hate", "worst", "useless", "disappointing", "frustrating",
    "بد", "مشکل", "خراب", "ناراضی", "کند", "سخت", "گیج",
    "اشتباه", "ناموفق", "بدترین", "بی‌فایده", "ناامیدکننده",
}

STOP_WORDS = {
    # English
    "the", "a", "an", "is", "in", "on", "at", "to", "of", "and",
    "or", "but", "with", "for", "was", "are", "it", "this", "that",
    "be", "has", "have", "had", "do", "did", "not", "my", "i",
    # Persian
    "این", "که", "از", "به", "در", "با", "را", "هم", "هر",
    "یک", "ما", "شما", "آن", "او", "ها", "های", "می",
}


# ─── Single-response analysis ─────────────────────────────────

def analyze_sentiment(text: str) -> str:
    """Return 'positive', 'negative', or 'neutral'."""
    if not text:
        return "neutral"
    words = set(re.findall(r"[\w\u0600-\u06FF]+", text.lower()))
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _sentiment_score(text: str) -> int:
    """Return -1, 0, or +1 for sorting/averaging."""
    s = analyze_sentiment(text)
    return 1 if s == "positive" else -1 if s == "negative" else 0


def extract_keywords(text: str, top_n: int = 7) -> list[str]:
    """Return the most frequent meaningful words."""
    if not text:
        return []
    words = re.findall(r"[\w\u0600-\u06FF]+", text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w not in STOP_WORDS and len(w) > 2:
            freq[w] = freq.get(w, 0) + 1
    return sorted(freq, key=lambda x: -freq[x])[:top_n]


def summarize_text(text: str, max_chars: int = 200) -> str:
    """Return first sentence or truncated text."""
    if not text:
        return ""
    sentences = re.split(r"[.!?\n]+", text.strip())
    summary = sentences[0].strip() if sentences else text
    return summary[:max_chars]


def analyze_text_field(text: str) -> dict[str, Any]:
    """Single-response NLP. Stored in FormAnalysis per field per form (upserted)."""
    cleaned = text.strip() if text else ""
    return {
        "sentiment": analyze_sentiment(cleaned),
        "keywords": extract_keywords(cleaned),
        "summary": summarize_text(cleaned),
        "word_count": len(cleaned.split()),
        "char_count": len(cleaned),
    }


# ─── Corpus-level aggregate analysis ─────────────────────────

def analyze_text_corpus(texts: list[str]) -> dict[str, Any]:
    """
    Aggregate NLP across ALL text responses for one field.

    Returns:
      {
        total_responses: int,
        sentiment_distribution: { positive: int, negative: int, neutral: int },
        dominant_sentiment: str,
        sentiment_score: float,       # -1.0 to +1.0
        top_keywords: [str],          # across all responses
        avg_word_count: float,
        short_response_rate: float,   # % with < 5 words (low-effort)
        sample_positive: str | None,  # example positive response
        sample_negative: str | None,  # example negative response
        recent_sentiment_trend: str,  # "improving" | "declining" | "stable"
      }
    """
    cleaned = [t.strip() for t in texts if t and t.strip()]
    if not cleaned:
        return {
            "total_responses": 0,
            "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
            "dominant_sentiment": "neutral",
            "sentiment_score": 0.0,
            "top_keywords": [],
            "avg_word_count": 0.0,
            "short_response_rate": 0.0,
            "sample_positive": None,
            "sample_negative": None,
            "recent_sentiment_trend": "stable",
        }

    sentiments = [analyze_sentiment(t) for t in cleaned]
    dist = {"positive": 0, "negative": 0, "neutral": 0}
    for s in sentiments:
        dist[s] = dist.get(s, 0) + 1

    scores = [_sentiment_score(t) for t in cleaned]
    avg_score = round(statistics.mean(scores), 3) if scores else 0.0

    dominant = max(dist, key=lambda k: dist[k])

    # Aggregate keywords across all responses
    all_words: dict[str, int] = {}
    for t in cleaned:
        for w in re.findall(r"[\w\u0600-\u06FF]+", t.lower()):
            if w not in STOP_WORDS and len(w) > 2:
                all_words[w] = all_words.get(w, 0) + 1
    top_keywords = sorted(all_words, key=lambda x: -all_words[x])[:10]

    word_counts = [len(t.split()) for t in cleaned]
    avg_wc = round(statistics.mean(word_counts), 1) if word_counts else 0.0
    short_rate = round(sum(1 for wc in word_counts if wc < 5) / len(word_counts), 3)

    # Sample responses
    positive_samples = [t for t, s in zip(cleaned, sentiments) if s == "positive"]
    negative_samples = [t for t, s in zip(cleaned, sentiments) if s == "negative"]

    # Trend: compare sentiment score of last 1/3 vs first 1/3
    if len(scores) >= 6:
        third = len(scores) // 3
        early_avg = statistics.mean(scores[:third])
        recent_avg = statistics.mean(scores[-third:])
        diff = recent_avg - early_avg
        trend = "improving" if diff > 0.15 else "declining" if diff < -0.15 else "stable"
    else:
        trend = "stable"

    return {
        "total_responses": len(cleaned),
        "sentiment_distribution": dist,
        "dominant_sentiment": dominant,
        "sentiment_score": avg_score,
        "top_keywords": top_keywords,
        "avg_word_count": avg_wc,
        "short_response_rate": short_rate,
        "sample_positive": positive_samples[0][:200] if positive_samples else None,
        "sample_negative": negative_samples[0][:200] if negative_samples else None,
        "recent_sentiment_trend": trend,
    }
