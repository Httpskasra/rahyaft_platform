"use client";

import { useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import type { AiAnalyticsResult } from "@/lib/api/analytics";

export default function AiAnalyticsPanel({
  title = "تحلیل هوشمند",
  onSummarize,
  onAsk,
}: {
  title?: string;
  onSummarize: () => Promise<AiAnalyticsResult>;
  onAsk: (question: string) => Promise<AiAnalyticsResult>;
}) {
  const [result, setResult] = useState<AiAnalyticsResult | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const runSummary = async () => {
    setLoading(true);
    try { setResult(await onSummarize()); } finally { setLoading(false); }
  };
  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try { setResult(await onAsk(question.trim())); } finally { setLoading(false); }
  };

  const sev: Record<string,string> = {
    critical: "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
    positive: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    info: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
  };

  return <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm dark:border-violet-500/20 dark:from-violet-500/10 dark:to-gray-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-600 p-2 text-white"><Bot size={18}/></div><div><h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3><p className="text-xs text-gray-500">تفسیر KPI، anomaly و SLA بر اساس داده‌های تجمیعی همین صفحه</p></div></div>
      <button onClick={runSummary} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading?<Loader2 className="animate-spin" size={16}/>:<Sparkles size={16}/>} تحلیل AI</button>
    </div>

    <div className="mt-4 flex gap-2"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") void ask()}} placeholder="مثلاً چرا زمان تأیید بالا رفته؟" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-500/20 dark:bg-gray-900"/><button onClick={ask} disabled={loading||!question.trim()} className="rounded-xl border border-violet-200 bg-white px-3 text-violet-700 disabled:opacity-50 dark:border-violet-500/20 dark:bg-gray-900 dark:text-violet-300"><Send size={17}/></button></div>

    {result && <div className="mt-4 space-y-4">
      {!result.available ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"><b>AI در دسترس نیست.</b><p className="mt-1 text-xs">{result.disclaimer}</p></div> : <>
        <div className="rounded-xl bg-white/80 p-4 text-sm leading-7 text-gray-700 dark:bg-gray-900/70 dark:text-gray-200">{result.answer || result.summary}</div>
        {result.findings.length>0 && <div className="grid gap-2 md:grid-cols-2">{result.findings.map((x,i)=><div key={`${x.title}-${i}`} className={`rounded-xl border p-3 ${sev[x.severity]??sev.info}`}><p className="text-sm font-semibold">{x.title}</p><p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-300">{x.detail}</p></div>)}</div>}
        {result.recommendations.length>0 && <div><p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">پیشنهادهای عملی</p><div className="space-y-2">{result.recommendations.map((x,i)=><div key={`${x.title}-${i}`} className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{x.title}</p><span className="text-[10px] text-gray-500">{x.priority}</span></div><p className="mt-1 text-xs leading-6 text-gray-500">{x.detail}</p></div>)}</div></div>}
        <p className="text-[11px] text-gray-400">مدل: {result.model ?? "—"} · {result.disclaimer}</p>
      </>}
    </div>}
  </section>;
}
