"use client";

import { AlertTriangle, CheckCircle2, Info, Lightbulb, Siren, Sparkles } from "lucide-react";
import type { AnalyticsAnomaly, AnalyticsInsight, InsightSeverity } from "@/lib/api/analytics";

const config: Record<InsightSeverity, { label: string; card: string; badge: string; Icon: typeof Info }> = {
  critical: { label: "بحرانی", card: "border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-500/5", badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", Icon: Siren },
  warning: { label: "هشدار", card: "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5", badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", Icon: AlertTriangle },
  info: { label: "اطلاع", card: "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", Icon: Info },
  positive: { label: "پایدار", card: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", Icon: CheckCircle2 },
};

export default function InsightPanel({ insights, anomalies = [], title = "Insight Engine" }: { insights: AnalyticsInsight[]; anomalies?: AnalyticsAnomaly[]; title?: string }) {
  return <section className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Sparkles size={20}/></div><div><h3 className="font-bold text-gray-900 dark:text-white">{title}</h3><p className="mt-1 text-xs text-gray-500">تحلیل Rule-based و آماری؛ بدون استفاده از LLM</p></div></div>
      <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{insights.length.toLocaleString("fa-IR")} بینش · {anomalies.length.toLocaleString("fa-IR")} anomaly</div>
    </div>

    {insights.length ? <div className="mt-4 grid gap-3 xl:grid-cols-2">{insights.map(insight => {
      const item = config[insight.severity] ?? config.info; const Icon = item.Icon;
      return <article key={insight.id} className={`rounded-2xl border p-4 ${item.card}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2.5"><Icon size={18} className="mt-0.5 shrink-0"/><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badge}`}>{item.label}</span><span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-white/10">{insight.category}</span></div><p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{insight.message}</p></div></div></div>
        {insight.evidence?.length ? <div className="mt-3 flex flex-wrap gap-2">{insight.evidence.map((evidence, index) => <span key={`${insight.id}-${index}`} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs text-gray-600 shadow-sm dark:bg-black/10 dark:text-gray-300">{evidence}</span>)}</div> : null}
        {insight.recommendation ? <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs leading-5 text-gray-700 dark:bg-black/10 dark:text-gray-300"><Lightbulb size={15} className="mt-0.5 shrink-0"/><div><b>پیشنهاد:</b> {insight.recommendation}</div></div> : null}
      </article>;
    })}</div> : <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">برای این بازه Insight قابل اتکایی تولید نشد.</div>}
  </section>;
}
