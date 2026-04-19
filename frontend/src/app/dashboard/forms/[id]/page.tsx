"use client";

import React, { useEffect, useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import {
  formsApi,
  submissionsApi,
  DeepAnalysis,
  FieldRollingStats,
  NlpCorpus,
  SubmissionHistoryItem,
  DomainInsights,
  TrendAnalysis,
  CompletionHealth,
  Predictions,
  RiskAssessment,
  AnomalyDetection,
  Submission,
} from "@/lib/api/forms";
import {
  ArrowRight, RefreshCw, Send, Loader2, CheckCircle,
  Brain, Shield, Activity, TrendingUp, TrendingDown,
  AlertTriangle, Zap, Award, Info, Target, Users, Hash, Clock,
  BarChart2, Eye, ChevronDown, ChevronUp, Calendar, Minus,
  MessageSquare,
} from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────
function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
function fmt(n: number | null | undefined, dec = 1): string {
  if (n == null) return "—";
  return n.toFixed(dec);
}

// ─── SVG / Pure-CSS Charts ────────────────────────────────────

function HBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }} />
    </div>
  );
}

function VerticalBars({ data, height = 72 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <p className="text-xs text-gray-400 py-4 text-center">داده کافی نیست</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full rounded-t bg-blue-400 dark:bg-blue-500 group-hover:bg-blue-600 transition-colors"
            style={{ height: `${Math.max((d.value / max) * (height - 16), d.value > 0 ? 3 : 0)}px` }}
          />
          <span className="text-[9px] text-gray-400 mt-1 truncate max-w-full px-px">{d.label}</span>
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none flex-col items-center">
            <span>{d.label}</span>
            <span className="font-bold">{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SparkArea({ values, color = "#3b82f6", height = 40 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const W = 200, H = height;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * W, y: H - ((v - min) / range) * H }));
  const line = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg${color.replace("#","")})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const filtered = segments.filter(s => s.value > 0);
  const total = filtered.reduce((s, x) => s + x.value, 0) || 1;
  const r = 36, cx = 44, cy = 44;
  let angle = -Math.PI / 2;
  const arcs = filtered.map(seg => {
    const frac = seg.value / total;
    const a1 = angle;
    const a2 = angle + frac * 2 * Math.PI;
    angle = a2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2},${y2} Z`, color: seg.color, label: seg.label, value: seg.value, pct: Math.round(frac * 100) };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 88 88" className="w-20 h-20 shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} stroke="white" strokeWidth="1.5" className="dark:stroke-gray-900" />)}
        <circle cx={cx} cy={cy} r={20} fill="white" className="dark:fill-gray-900" />
      </svg>
      <div className="space-y-1.5 min-w-0">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: a.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate">{a.label}</span>
            <span className="font-semibold text-gray-900 dark:text-white ml-auto pl-2">{a.value} ({a.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemiGauge({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 34, cx = 44, cy = 46;
  const arc = (deg: number) => ({ x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy + r * Math.sin((deg * Math.PI) / 180) });
  const s = arc(-180), e = arc(0), ea = arc(-180 + pct * 180);
  return (
    <svg viewBox="0 0 88 54" className="w-full">
      <path d={`M${s.x},${s.y} A${r},${r} 0 0 1 ${e.x},${e.y}`} fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" className="dark:stroke-gray-700" />
      {pct > 0.01 && (
        <path d={`M${s.x},${s.y} A${r},${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${ea.x},${ea.y}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      )}
      <text x={cx} y={44} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{value}</text>
      <text x={cx} y={53} textAnchor="middle" fontSize="7" fill="#9ca3af">/{max}</text>
    </svg>
  );
}

// ─── Shared UI ────────────────────────────────────────────────

type ColorKey = "blue" | "green" | "amber" | "red" | "purple" | "gray";

const BG: Record<ColorKey, string> = {
  blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  purple: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  gray: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

function KpiCard({ label, value, sub, icon, color = "blue", trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: ColorKey; trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between mb-2">
        <span className={cn("p-2 rounded-xl", BG[color])}>{icon}</span>
        {trend != null && (
          <span className={cn("text-xs font-semibold flex items-center gap-0.5", trend >= 0 ? "text-emerald-600" : "text-red-500")}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, icon, children, className }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5", className)}>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const s: Record<string, string> = {
    low: "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-800 dark:text-emerald-400",
    medium: "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-800 dark:text-amber-400",
    high: "bg-red-50 border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-800 dark:text-red-400",
  };
  const l: Record<string, string> = { low: "کم‌ریسک", medium: "میانی", high: "پر‌ریسک" };
  return <span className={cn("inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold", s[level] ?? s.low)}>{l[level] ?? level}</span>;
}

// ─── Domain config ────────────────────────────────────────────
const DOMAIN_CFG: Record<string, { emoji: string; colorClass: string; bgClass: string }> = {
  hr:         { emoji: "👥", colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-50 dark:bg-purple-500/10" },
  product:    { emoji: "📦", colorClass: "text-blue-600 dark:text-blue-400",     bgClass: "bg-blue-50 dark:bg-blue-500/10" },
  survey:     { emoji: "📋", colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-500/10" },
  support:    { emoji: "🎧", colorClass: "text-amber-600 dark:text-amber-400",   bgClass: "bg-amber-50 dark:bg-amber-500/10" },
  finance:    { emoji: "💰", colorClass: "text-green-600 dark:text-green-400",   bgClass: "bg-green-50 dark:bg-green-500/10" },
  operations: { emoji: "⚙️", colorClass: "text-gray-600 dark:text-gray-400",    bgClass: "bg-gray-100 dark:bg-gray-800" },
  unknown:    { emoji: "📄", colorClass: "text-gray-500 dark:text-gray-400",     bgClass: "bg-gray-100 dark:bg-gray-800" },
};

const CATEGORY_LABEL: Record<string, string> = {
  quantitative: "کمی / داده‌محور",
  qualitative: "کیفی / متن‌محور",
  choice_based: "انتخابی / نظرسنجی",
  mixed: "ترکیبی",
  unknown: "نامشخص",
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

// ─── NLP Corpus Panel ─────────────────────────────────────────

function NlpCorpusPanel({ nlp, fieldLabel }: { nlp: NlpCorpus; fieldLabel: string }) {
  const sentScore = nlp.sentiment_score;
  const scoreColor = sentScore > 0.1 ? "#10b981" : sentScore < -0.1 ? "#ef4444" : "#9ca3af";
  const trendLabel = { improving: "در حال بهبود ↑", declining: "در حال افت ↓", stable: "ثابت →" };
  const trendColor = { improving: "text-emerald-600", declining: "text-red-500", stable: "text-gray-400" };

  return (
    <div className="rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-900/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
          <Brain size={12} /> تحلیل زبانی — {fieldLabel} ({nlp.total_responses} پاسخ)
        </p>
        <span className={cn("text-xs font-semibold", trendColor[nlp.recent_sentiment_trend])}>
          {trendLabel[nlp.recent_sentiment_trend]}
        </span>
      </div>

      {/* Sentiment distribution */}
      <div className="grid grid-cols-3 gap-2">
        {(["positive", "negative", "neutral"] as const).map(s => {
          const count = nlp.sentiment_distribution[s];
          const pct = nlp.total_responses ? Math.round(count / nlp.total_responses * 100) : 0;
          const colors = { positive: "#10b981", negative: "#ef4444", neutral: "#9ca3af" };
          const labels = { positive: "مثبت 😊", negative: "منفی 😞", neutral: "خنثی 😐" };
          return (
            <div key={s} className="rounded-lg bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/20 p-2 text-center">
              <p className="text-xs text-gray-400 mb-1">{labels[s]}</p>
              <p className="text-base font-bold" style={{ color: colors[s] }}>{count}</p>
              <p className="text-[10px] text-gray-400">{pct}%</p>
            </div>
          );
        })}
      </div>

      {/* Sentiment score bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>امتیاز احساس کلی</span>
          <span style={{ color: scoreColor }}>{sentScore > 0 ? "+" : ""}{sentScore.toFixed(2)}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400 dark:bg-gray-600" />
          {sentScore >= 0
            ? <div className="h-full rounded-r-full" style={{ width: `${sentScore * 50}%`, marginLeft: "50%", background: scoreColor }} />
            : <div className="h-full rounded-l-full" style={{ width: `${Math.abs(sentScore) * 50}%`, marginLeft: `${50 - Math.abs(sentScore) * 50}%`, background: scoreColor }} />
          }
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
          <span>منفی</span>
          <span>مثبت</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
        <span>میانگین طول: {fmt(nlp.avg_word_count)} کلمه</span>
        <span>پاسخ کوتاه: {Math.round(nlp.short_response_rate * 100)}%</span>
      </div>

      {/* Top keywords */}
      {nlp.top_keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {nlp.top_keywords.map(kw => (
            <span key={kw} className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded px-2 py-0.5 text-xs">{kw}</span>
          ))}
        </div>
      )}

      {/* Sample quotes */}
      {nlp.sample_positive && (
        <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-500/5 p-2.5">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">نمونه پاسخ مثبت</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{nlp.sample_positive}"</p>
        </div>
      )}
      {nlp.sample_negative && (
        <div className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-500/5 p-2.5">
          <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-1">نمونه پاسخ منفی</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{nlp.sample_negative}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Field Accordion ──────────────────────────────────────────

interface SchemaField {
  id: string; type: string; label: string;
  description?: string; required?: boolean; options?: string[];
}

function FieldAccordion({ field, stat, nlp, submissions }: {
  field: SchemaField;
  stat: FieldRollingStats | undefined;
  nlp: NlpCorpus | undefined;
  submissions: Submission[];
}) {
  const [open, setOpen] = useState(false);
  const total = submissions.length;
  const filled = submissions.filter(s => {
    const v = s.data[field.id];
    return v != null && v !== "" && !(Array.isArray(v) && (v as unknown[]).length === 0);
  }).length;
  const fillRate = total ? Math.round(filled / total * 100) : 0;
  const statusColor = fillRate >= 90 ? "#10b981" : fillRate >= 70 ? "#3b82f6" : fillRate >= 50 ? "#f59e0b" : "#ef4444";

  const dist = stat?.distribution as Record<string, number> | undefined;
  const distEntries = dist ? Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8) : [];
  const distMax = distEntries[0]?.[1] || 1;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800 dark:text-white">{field.label}</p>
          <p className="text-xs text-gray-400">{field.type}{field.required ? " · الزامی" : " · اختیاری"} · {stat?.count ?? 0} پاسخ</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${fillRate}%`, background: statusColor }} />
            </div>
            <span className="text-xs font-bold w-8 text-left" style={{ color: statusColor }}>{fillRate}%</span>
          </div>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4" dir="rtl">
          {field.description && <p className="text-xs text-gray-500 italic">{field.description}</p>}

          {/* Fill rate */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>نرخ تکمیل</span>
              <span>{filled} از {total}</span>
            </div>
            <HBar pct={fillRate} color={statusColor} />
            <p className="text-xs mt-1" style={{ color: statusColor }}>
              {fillRate >= 90 ? "✅ عالی" : fillRate >= 70 ? "✓ خوب" : fillRate >= 50 ? "⚠️ متوسط — بررسی شود" : "🔴 بحرانی — فیلد مبهم است"}
            </p>
          </div>

          {/* Numeric stats grid */}
          {field.type === "number" && stat && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: "میانگین", v: fmt(stat.avg) },
                { l: "میانه", v: fmt(stat.median) },
                { l: "کمینه", v: fmt(stat.min) },
                { l: "بیشینه", v: fmt(stat.max) },
                { l: "انحراف معیار", v: fmt(stat.std) },
                { l: "Q1 (25٪)", v: fmt(stat.p25) },
                { l: "Q3 (75٪)", v: fmt(stat.p75) },
                { l: "تعداد", v: String(stat.count ?? 0) },
              ].map(s => (
                <div key={s.l} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">{s.l}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{s.v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Choice distribution */}
          {distEntries.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">توزیع پاسخ‌ها</p>
              <div className="space-y-2">
                {distEntries.map(([opt, cnt], i) => (
                  <div key={opt}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[55%]">{opt || "—"}</span>
                      <span className="text-gray-400">{cnt} · {Math.round(cnt / (stat?.count || 1) * 100)}%</span>
                    </div>
                    <HBar pct={(cnt / distMax) * 100} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boolean checkbox */}
          {field.type === "checkbox" && stat?.true_rate != null && (
            <div className="flex items-center gap-4">
              <DonutChart segments={[
                { label: "بله", value: stat.true_count ?? 0, color: "#10b981" },
                { label: "خیر", value: stat.false_count ?? 0, color: "#e5e7eb" },
              ]} />
              <p className="text-xs text-gray-500">{Math.round((stat.true_rate ?? 0) * 100)}٪ پاسخ مثبت</p>
            </div>
          )}

          {/* Text stats */}
          {(field.type === "text" || field.type === "textarea") && stat && (
            <div className="flex gap-2 flex-wrap">
              {[
                { l: "تعداد", v: String(stat.count ?? 0) },
                { l: "منحصربه‌فرد", v: String(stat.unique ?? 0) },
                { l: "میانگین طول", v: stat.avg_length != null ? `${stat.avg_length} کاراکتر` : "—" },
              ].map(s => (
                <div key={s.l} className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">{s.l}</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">{s.v}</p>
                </div>
              ))}
              {stat.top && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-[10px] text-gray-400 mb-0.5">رایج‌ترین</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white truncate max-w-[160px]">{stat.top}</p>
                </div>
              )}
            </div>
          )}

          {/* NLP corpus */}
          {nlp && <NlpCorpusPanel nlp={nlp} fieldLabel={field.label} />}
        </div>
      )}
    </div>
  );
}

// ─── Submission history chart ─────────────────────────────────

function HistoryChart({ history }: { history: SubmissionHistoryItem[] }) {
  const last40 = history.slice(-40);
  const riskColor = (l: string) => l === "high" ? "#ef4444" : l === "medium" ? "#f59e0b" : "#10b981";
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">آخرین {last40.length} پاسخ — ارتفاع = تکمیل · رنگ = سطح ریسک</p>
      <div className="flex gap-px items-end" style={{ height: 52 }}>
        {last40.map((item, i) => (
          <div key={i} className="flex-1 group relative">
            <div
              className="w-full rounded-sm"
              style={{ height: `${Math.max(item.completion_pct, 4)}%`, background: riskColor(item.risk_level), opacity: 0.85 }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none flex-col items-center">
              <span>تکمیل: {item.completion_pct}%</span>
              <span>ریسک: {item.risk_score}</span>
              <span>{new Date(item.createdAt).toLocaleDateString("fa-IR")}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        {[["#10b981", "کم‌ریسک"], ["#f59e0b", "میانی"], ["#ef4444", "پرریسک"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Completion health ────────────────────────────────────────

function CompletionHealthPanel({ health }: { health: CompletionHealth }) {
  const sc = { excellent: "#10b981", good: "#3b82f6", warning: "#f59e0b", critical: "#ef4444" };
  const overallColor = health.overall_score >= 90 ? sc.excellent : health.overall_score >= 70 ? sc.good : health.overall_score >= 50 ? sc.warning : sc.critical;
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">امتیاز کلی سلامت</span>
          <span className="font-bold" style={{ color: overallColor }}>{health.overall_score}٪</span>
        </div>
        <HBar pct={health.overall_score} color={overallColor} />
      </div>
      <div className="space-y-2">
        {health.field_health.map(fh => (
          <div key={fh.field_id} className="flex items-center gap-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sc[fh.status] }} />
            <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{fh.label}</span>
            {fh.required && <span className="text-[10px] text-gray-400">الزامی</span>}
            <div className="w-16"><HBar pct={fh.fill_rate} color={sc[fh.status]} /></div>
            <span className="w-8 text-left font-mono text-gray-500 text-[11px]">{fh.fill_rate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Predictions ──────────────────────────────────────────────

function PredictionsPanel({ preds }: { preds: Predictions }) {
  return (
    <div className="space-y-3">
      {preds.next_week_volume && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-500/5 p-3.5">
          <TrendingUp size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">پیش‌بینی هفته آینده</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              تعداد احتمالی: <strong>{preds.next_week_volume.value}</strong> پاسخ ·
              اطمینان: {preds.next_week_volume.confidence === "medium" ? "متوسط" : "پایین"} ·
              {preds.next_week_volume.basis}
            </p>
          </div>
        </div>
      )}
      {preds.field_predictions && Object.values(preds.field_predictions).map((fp, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3.5">
          <Target size={14} className="text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fp.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              میانگین پیش‌بینی: <strong>{fmt(fp.predicted_avg)}</strong> · بازه ۹۵٪: [{fmt(fp.confidence_interval[0])}, {fmt(fp.confidence_interval[1])}]
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Submissions table ────────────────────────────────────────

function SubmissionsTable({ submissions, fields }: {
  submissions: Submission[];
  fields: SchemaField[];
}) {
  const cols = fields.slice(0, 4);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <th className="pb-2 font-medium text-right pr-1">کاربر</th>
            <th className="pb-2 font-medium text-right">تاریخ</th>
            {cols.map(f => <th key={f.id} className="pb-2 font-medium text-right">{f.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {submissions.slice(0, 20).map(sub => (
            <tr key={sub.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="py-2 pr-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{sub.user?.name ?? "ناشناس"}</td>
              <td className="py-2 text-gray-400 whitespace-nowrap">
                {new Date(sub.createdAt).toLocaleDateString("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </td>
              {cols.map(f => {
                const v = sub.data[f.id];
                const display = Array.isArray(v) ? (v as string[]).join(", ") : v != null ? String(v).slice(0, 30) : "—";
                return <td key={f.id} className="py-2 text-gray-600 dark:text-gray-400 max-w-[110px] truncate">{display || "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {submissions.length > 20 && (
        <p className="text-xs text-gray-400 mt-3 text-center">نمایش ۲۰ مورد از {submissions.length} پاسخ</p>
      )}
    </div>
  );
}

// ─── Main Analytics Dashboard ─────────────────────────────────

function AnalyticsDashboard({ data }: { data: DeepAnalysis }) {
  const { form, submissions, analytics, statsByField, nlpByField } = data;
  const fields = (form.schema?.fields ?? []) as SchemaField[];

  const domain = analytics.domainClassification?.domain ?? "unknown";
  const dcfg = DOMAIN_CFG[domain] ?? DOMAIN_CFG.unknown;
  const di = analytics.domainInsights as DomainInsights | null;
  const risk = analytics.riskAssessment as RiskAssessment | null;
  const anomaly = analytics.anomalyDetection as AnomalyDetection | null;
  const trend = analytics.trendAnalysis as TrendAnalysis | null;
  const health = analytics.completionHealth as CompletionHealth | null;
  const preds = analytics.predictions as Predictions | null;
  const history = analytics.submissionHistory as SubmissionHistoryItem[] | null;

  const uniqueUsers = new Set(submissions.map(s => s.userId).filter(Boolean)).size;
  const now = Date.now();
  const last7 = submissions.filter(s => now - new Date(s.createdAt).getTime() < 7 * 86400000).length;
  const prev7 = submissions.filter(s => { const a = now - new Date(s.createdAt).getTime(); return a >= 7 * 86400000 && a < 14 * 86400000; }).length;
  const velocityPct = prev7 ? Math.round((last7 - prev7) / prev7 * 100) : null;

  const weeklyBars = (trend?.weekly_counts ?? []).map(w => ({ label: w.week.slice(6), value: w.count }));
  const weeklyValues = weeklyBars.map(b => b.value);

  const trendIcon = trend?.volume_trend === "up" ? <TrendingUp size={12} className="text-emerald-500" />
    : trend?.volume_trend === "down" ? <TrendingDown size={12} className="text-red-500" />
    : <Minus size={12} className="text-gray-400" />;

  return (
    <div className="space-y-5">

      {/* ── Domain banner ── */}
      <div className={cn("rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4", dcfg.bgClass)}>
        <span className="text-3xl leading-none">{dcfg.emoji}</span>
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", dcfg.colorClass)}>{di?.domain_label ?? domain}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {submissions.length} پاسخ · {fields.length} فیلد · نسخه {form.version}
          </p>
        </div>
        <div className="mr-auto flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
          {trendIcon}
          {trend?.volume_trend === "up" && <span className="text-emerald-600">رشد {trend.trend_pct}٪</span>}
          {trend?.volume_trend === "down" && <span className="text-red-500">افت {Math.abs(trend.trend_pct ?? 0)}٪</span>}
          {trend?.volume_trend === "flat" && <span>حجم ثابت</span>}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="کل پاسخ‌ها" value={submissions.length} sub={`${last7} در ۷ روز اخیر`} icon={<Hash size={15} />} color="blue" trend={velocityPct ?? undefined} />
        <KpiCard label="کاربران یکتا" value={uniqueUsers} sub={uniqueUsers < submissions.length ? "برخی چندبار پاسخ داده" : "هر کاربر یک بار"} icon={<Users size={15} />} color="purple" />
        <KpiCard label="سلامت تکمیل" value={`${health?.overall_score ?? 0}٪`} sub={`${fields.length} فیلد`} icon={<Target size={15} />} color={health && health.overall_score >= 80 ? "green" : health && health.overall_score >= 60 ? "amber" : "red"} />
        <KpiCard label="ریسک آخرین پاسخ" value={risk?.risk_score ?? "—"} sub={risk ? { low: "کم‌ریسک", medium: "میانی", high: "پرریسک" }[risk.risk_level] : "—"} icon={<Shield size={15} />} color={risk?.risk_level === "high" ? "red" : risk?.risk_level === "medium" ? "amber" : "green"} />
      </div>

      {/* ── Domain KPIs ── */}
      {di && Object.keys(di.kpis).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.values(di.kpis).map((kpi, i) => (
            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Volume trend ── */}
      {weeklyBars.length > 1 && (
        <Card title="روند حجم پاسخ‌ها — ۸ هفته اخیر" icon={<Calendar size={14} className="text-blue-500" />}>
          <VerticalBars data={weeklyBars} height={72} />
          <div className="mt-2">
            <SparkArea values={weeklyValues} color="#3b82f6" height={32} />
          </div>
        </Card>
      )}

      {/* ── 3-col: Risk · Anomaly · Category ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card title="ارزیابی ریسک" icon={<Shield size={13} className="text-gray-400" />}>
          <SemiGauge
            value={risk?.risk_score ?? 0}
            max={100}
            color={risk?.risk_level === "high" ? "#ef4444" : risk?.risk_level === "medium" ? "#f59e0b" : "#10b981"}
          />
          {risk?.risk_level && <div className="flex justify-center mt-2"><RiskBadge level={risk.risk_level} /></div>}
          {risk?.reasons && risk.reasons.length > 0 && (
            <ul className="mt-3 space-y-1">
              {risk.reasons.map((r, i) => <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1"><AlertTriangle size={10} className="mt-0.5 shrink-0" />{r}</li>)}
            </ul>
          )}
          {risk?.passed_checks && risk.passed_checks.length > 0 && (
            <ul className="mt-2 space-y-1">
              {risk.passed_checks.map((c, i) => <li key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1"><CheckCircle size={10} className="mt-0.5 shrink-0" />{c}</li>)}
            </ul>
          )}
        </Card>

        <Card title="تشخیص ناهنجاری" icon={<Activity size={13} className="text-gray-400" />}>
          <div className="mb-3">
            <span className={cn("inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-xs font-semibold",
              anomaly?.is_anomaly
                ? "bg-red-50 border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-800 dark:text-red-400"
                : "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-800 dark:text-emerald-400"
            )}>
              {anomaly?.is_anomaly ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
              {anomaly?.is_anomaly ? "ناهنجاری شناسایی شد" : "داده‌ها طبیعی"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-2">Z-score: {anomaly?.anomaly_score?.toFixed(2) ?? "—"}</p>
          {anomaly?.anomalous_fields?.map((af, i) => (
            <div key={i} className="rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-900/30 p-2.5 mb-2 text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="font-medium text-red-700 dark:text-red-400">{af.field}</span>
                <span className="font-mono text-red-500">z={af.z_score}</span>
              </div>
              <p className="text-gray-500">مقدار: {af.value} · بازه طبیعی: [{af.expected_range[0]}, {af.expected_range[1]}]</p>
            </div>
          ))}
        </Card>

        <Card title="دسته‌بندی فرم" icon={<BarChart2 size={13} className="text-gray-400" />}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            {CATEGORY_LABEL[analytics.formCategory?.category ?? "unknown"]}
          </p>
          <DonutChart segments={[
            { label: "عددی", value: fields.filter(f => f.type === "number").length, color: "#3b82f6" },
            { label: "متنی", value: fields.filter(f => f.type === "text" || f.type === "textarea").length, color: "#8b5cf6" },
            { label: "انتخابی", value: fields.filter(f => ["select", "radio", "checkbox"].includes(f.type)).length, color: "#10b981" },
          ].filter(s => s.value > 0)} />
        </Card>
      </div>

      {/* ── Domain insights ── */}
      {di && (di.insights.length > 0 || di.warnings.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {di.insights.length > 0 && (
            <Card title={`بینش‌های ${di.domain_label}`} icon={<Brain size={14} className="text-purple-500" />}>
              <div className="space-y-2">
                {di.insights.map((ins, i) => {
                  const styles = {
                    positive: "border-emerald-100 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/5 dark:border-emerald-900/30 dark:text-emerald-300",
                    neutral: "border-blue-100 bg-blue-50 text-blue-800 dark:bg-blue-500/5 dark:border-blue-900/30 dark:text-blue-300",
                    warning: "border-amber-100 bg-amber-50 text-amber-800 dark:bg-amber-500/5 dark:border-amber-900/30 dark:text-amber-300",
                  };
                  const icons = { positive: <Award size={12} />, neutral: <Info size={12} />, warning: <AlertTriangle size={12} /> };
                  return (
                    <div key={i} className={cn("flex items-start gap-2 rounded-xl border p-3 text-xs", styles[ins.type as keyof typeof styles] ?? styles.neutral)}>
                      <span className="shrink-0 mt-0.5">{icons[ins.type as keyof typeof icons] ?? icons.neutral}</span>
                      <p className="leading-relaxed">{ins.message}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {di.warnings.length > 0 && (
            <Card title="هشدارها" icon={<AlertTriangle size={14} className="text-amber-500" />}>
              <div className="space-y-2">
                {di.warnings.map((w, i) => (
                  <div key={i} className={cn("flex items-start gap-2.5 rounded-xl border p-3.5",
                    w.severity === "high" ? "border-red-200 bg-red-50 dark:bg-red-500/5 dark:border-red-900/30"
                      : w.severity === "medium" ? "border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-900/30"
                      : "border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                  )}>
                    <AlertTriangle size={14} className={cn("shrink-0 mt-0.5", w.severity === "high" ? "text-red-500" : "text-amber-500")} />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{w.field}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{w.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Recommendations ── */}
      {di && di.recommendations.length > 0 && (
        <Card title="توصیه‌های اقدام" icon={<Zap size={14} className="text-purple-500" />}>
          <div className="space-y-2">
            {di.recommendations.map((r, i) => {
              const badge = { high: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400", medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
              const lbl = { high: "اولویت بالا", medium: "اولویت متوسط", low: "اولویت پایین" };
              return (
                <div key={i} className="flex gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                  <Zap size={14} className="text-purple-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs font-semibold text-gray-800 dark:text-white">{r.action}</p>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", badge[r.priority as keyof typeof badge] ?? badge.low)}>
                        {lbl[r.priority as keyof typeof lbl] ?? r.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{r.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Completion health ── */}
      {health && health.field_health.length > 0 && (
        <Card title="سلامت تکمیل فیلدها" icon={<Target size={14} className="text-blue-500" />}>
          <CompletionHealthPanel health={health} />
        </Card>
      )}

      {/* ── Submission history ── */}
      {history && history.length > 1 && (
        <Card title="تاریخچه ریسک و تکمیل پاسخ‌ها" icon={<Activity size={14} className="text-gray-400" />}>
          <HistoryChart history={history} />
        </Card>
      )}

      {/* ── Predictions ── */}
      {preds && (preds.next_week_volume || preds.field_predictions) && (
        <Card title="پیش‌بینی‌ها" icon={<TrendingUp size={14} className="text-blue-500" />}>
          <PredictionsPanel preds={preds} />
        </Card>
      )}

      {/* ── Field deep analysis ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <Eye size={14} className="text-blue-500" /> تحلیل عمیق فیلدها
          <span className="text-xs text-gray-400 font-normal">— کلیک کنید برای باز کردن</span>
        </h3>
        <div className="space-y-2">
          {fields.map(f => (
            <FieldAccordion
              key={f.id}
              field={f}
              stat={statsByField[f.id]}
              nlp={nlpByField[f.id]}
              submissions={submissions}
            />
          ))}
        </div>
      </div>

      {/* ── NLP summary for all text fields at-a-glance ── */}
      {Object.keys(nlpByField).length > 0 && (
        <Card title="خلاصه تحلیل متن همه فیلدها" icon={<MessageSquare size={14} className="text-purple-500" />}>
          <div className="space-y-3">
            {Object.entries(nlpByField).map(([fid, nlp]) => {
              const field = fields.find(f => f.id === fid);
              if (!field) return null;
              const c = nlp as NlpCorpus;
              const scoreColor = c.sentiment_score > 0.1 ? "#10b981" : c.sentiment_score < -0.1 ? "#ef4444" : "#9ca3af";
              return (
                <div key={fid} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-700 dark:text-gray-300 w-32 shrink-0 truncate">{field.label}</span>
                  <div className="flex-1">
                    <HBar pct={50 + c.sentiment_score * 50} color={scoreColor} />
                  </div>
                  <span className="font-mono w-10 text-left" style={{ color: scoreColor }}>{c.sentiment_score > 0 ? "+" : ""}{c.sentiment_score.toFixed(2)}</span>
                  <span className="text-gray-400 w-16 text-left">{c.total_responses} پاسخ</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Submissions table ── */}
      {submissions.length > 0 && (
        <Card title={`آخرین پاسخ‌ها (${submissions.length} کل)`} icon={<Clock size={14} className="text-gray-400" />}>
          <SubmissionsTable submissions={submissions} fields={fields} />
        </Card>
      )}
    </div>
  );
}

// ─── Submit panel ─────────────────────────────────────────────

function FieldRenderer({ field, value, onChange }: {
  field: SchemaField; value: unknown; onChange: (v: unknown) => void;
}) {
  const base = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const opts = Array.isArray(field.options) ? field.options.filter(Boolean) : [];
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}{field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {field.description && <p className="text-xs text-gray-400">{field.description}</p>}

      {field.type === "textarea" && <textarea rows={3} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={cn(base, "resize-none")} />}
      {field.type === "select" && (
        <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={base}>
          <option value="">-- انتخاب کنید --</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === "radio" && (
        <div className="flex flex-col gap-2 mt-1">
          {opts.map(o => (
            <label key={o} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" name={field.id} value={o} checked={(value as string) === o} onChange={() => onChange(o)} className="accent-blue-600" />
              {o}
            </label>
          ))}
        </div>
      )}
      {field.type === "checkbox" && opts.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {opts.map(o => {
            const sel = Array.isArray(value) ? (value as string[]) : [];
            return (
              <label key={o} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={sel.includes(o)} onChange={() => onChange(sel.includes(o) ? sel.filter(s => s !== o) : [...sel, o])} className="rounded accent-blue-600" />
                {o}
              </label>
            );
          })}
        </div>
      )}
      {field.type === "checkbox" && opts.length === 0 && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mt-1">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="rounded accent-blue-600" />
          {field.label}
        </label>
      )}
      {!["textarea", "select", "radio", "checkbox"].includes(field.type) && (
        <input type={field.type === "number" ? "number" : "text"} value={(value as string) ?? ""} onChange={e => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)} className={base} />
      )}
    </div>
  );
}

function SubmitFormPanel({ formId, fields, onSubmit }: {
  formId: string; fields: SchemaField[]; onSubmit: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true); setError("");
    try {
      await submissionsApi.submit(formId, values);
      setSuccess(true); setValues({});
      setTimeout(() => { setSuccess(false); onSubmit(); }, 2000);
    } catch {
      setError("خطا در ارسال فرم — دوباره تلاش کنید");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Send size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">ارسال پاسخ آزمایشی</h3>
      </div>
      {success ? (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 py-4">
          <CheckCircle size={20} /> پاسخ ارسال شد! در حال تحلیل…
        </div>
      ) : (
        <div className="space-y-5" dir="rtl">
          {fields.map(f => (
            <FieldRenderer key={f.id} field={f} value={values[f.id]} onChange={v => setValues(p => ({ ...p, [f.id]: v }))} />
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-opacity">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? "در حال ارسال..." : "ارسال"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<DeepAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analytics" | "submit">("analytics");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await formsApi.getDeepAnalysis(id);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-24 text-gray-500">
      <p>فرم یافت نشد یا خطایی رخ داد</p>
      <Link href="/dashboard/forms" className="text-blue-600 text-sm mt-2 inline-block hover:underline">بازگشت به لیست</Link>
    </div>
  );

  const fields = (data.form.schema?.fields ?? []) as SchemaField[];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard/forms" className="hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
          <ArrowRight size={14} /> فرم‌ها
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{data.form.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{data.form.name}</h1>
          {data.form.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{data.form.description}</p>}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> بروزرسانی
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 w-fit">
        {(["analytics", "submit"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}>
            {t === "analytics" ? "📊 تحلیل هوشمند" : "📝 ارسال پاسخ"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "analytics" ? (
        data.submissionCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
            <Brain size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">هنوز پاسخی ثبت نشده</p>
            <p className="text-xs text-gray-400 mb-4">پس از اولین ارسال، تمام تحلیل‌ها اینجا نمایش داده می‌شوند</p>
            <button onClick={() => setTab("submit")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Send size={14} /> ارسال اولین پاسخ
            </button>
          </div>
        ) : (
          <AnalyticsDashboard data={data} />
        )
      ) : (
        <SubmitFormPanel formId={data.form.id} fields={fields} onSubmit={load} />
      )}
    </div>
  );
}
