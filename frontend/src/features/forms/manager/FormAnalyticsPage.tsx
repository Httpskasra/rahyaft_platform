"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Gauge, Loader2, Save, ShieldCheck, TimerReset, XCircle } from "lucide-react";
import { formsApi, type FormAnalytics, type FormFieldAnalytics } from "@/lib/api/forms";
import { FormManagerHeader } from "./FormManagerHeader";
import ChartCard from "@/components/charts/ChartCard";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import AnalyticsDonut from "@/components/charts/AnalyticsDonut";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";
import InsightPanel from "@/components/analytics/InsightPanel";
import AiAnalyticsPanel from "@/components/analytics/AiAnalyticsPanel";

type Range = "7d" | "30d" | "90d";

function formatHours(value: number | null | undefined) {
  if (value == null) return "—";
  if (value < 1) return `${Math.round(value * 60).toLocaleString("fa-IR")} دقیقه`;
  if (value < 24) return `${value.toLocaleString("fa-IR")} ساعت`;
  return `${(value / 24).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} روز`;
}

function Kpi({ title, value, hint, icon: Icon }: { title: string; value: string; hint?: string; icon: typeof FileText }) {
  return <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-gray-500">{title}</p><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>{hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}</div><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10"><Icon size={18}/></div></div>
  </div>;
}

function FieldCard({ field }: { field: FormFieldAnalytics }) {
  const hasDistribution = Boolean(field.distribution?.length);
  const hasDateDistribution = Boolean(field.dateDistribution?.length);
  return <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div><h4 className="font-semibold text-gray-900 dark:text-white">{field.label}</h4><p className="mt-1 text-xs text-gray-500">{field.type} · {field.required ? "اجباری" : "اختیاری"}</p></div>
      <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">تکمیل {field.fillRate.toLocaleString("fa-IR")}%</div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10"><span className="text-emerald-700 dark:text-emerald-300">پرشده</span><b className="mt-1 block text-base">{field.filled.toLocaleString("fa-IR")}</b></div>
      <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10"><span className="text-rose-700 dark:text-rose-300">خالی</span><b className="mt-1 block text-base">{field.missing.toLocaleString("fa-IR")}</b></div>
      {field.numeric && <><div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10"><span className="text-blue-700 dark:text-blue-300">میانگین</span><b className="mt-1 block text-base">{field.numeric.average.toLocaleString("fa-IR")}</b></div><div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-500/10"><span className="text-violet-700 dark:text-violet-300">میانه</span><b className="mt-1 block text-base">{field.numeric.median.toLocaleString("fa-IR")}</b></div></>}
      {field.text && <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10"><span className="text-blue-700 dark:text-blue-300">میانگین طول پاسخ</span><b className="mt-1 block text-base">{field.text.averageLength.toLocaleString("fa-IR")}</b></div>}
    </div>
    {field.numeric && <div className="mt-3 text-xs text-gray-500">کمینه: {field.numeric.min.toLocaleString("fa-IR")} · بیشینه: {field.numeric.max.toLocaleString("fa-IR")}</div>}
    {hasDistribution && <div className="mt-4"><AnalyticsBarChart labels={field.distribution!.slice(0, 8).map(x => x.value)} series={[{ name: "تعداد", data: field.distribution!.slice(0, 8).map(x => x.count) }]} height={220}/></div>}
    {hasDateDistribution && <div className="mt-4"><AnalyticsBarChart labels={field.dateDistribution!.map(x => x.month)} series={[{ name: "تعداد", data: field.dateDistribution!.map(x => x.count) }]} height={220}/></div>}
  </section>;
}

export default function FormAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<FormAnalytics | null>(null);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [slaHours, setSlaHours] = useState<string>("");
  const [stepSla, setStepSla] = useState<Record<string, string>>({});
  const [savingSla, setSavingSla] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await formsApi.getAnalytics(id, range); setData(response.data); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, [id, range]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    setSlaHours(data.sla.targetHours == null ? "" : String(data.sla.targetHours));
    setStepSla(Object.fromEntries(data.sla.steps.map(s => [s.stepId, s.targetHours == null ? "" : String(s.targetHours)])));
  }, [data?.sla.targetHours, data?.sla.steps]);

  const saveSla = async () => {
    if (!data) return; setSavingSla(true);
    try {
      await formsApi.updateSla(id, { slaHours: slaHours ? Number(slaHours) : null, steps: data.sla.steps.map(s => ({ stepId: s.stepId, slaHours: stepSla[s.stepId] ? Number(stepSla[s.stepId]) : null })) });
      await load();
    } finally { setSavingSla(false); }
  };

  const chartLabels = useMemo(() => data?.trend.map((x) => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })) ?? [], [data]);
  const statusLabels: Record<string, string> = { APPROVED: "تأیید شده", REJECTED: "رد شده", PENDING: "در انتظار", NO_WORKFLOW: "بدون گردش تأیید" };

  if (loading && !data) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500"/></div>;
  if (!data) return <div className="py-20 text-center text-gray-500">داده تحلیلی فرم در دسترس نیست.</div>;

  const k = data.kpis;
  const funnelLabels = data.approvalFunnel.map(step => `مرحله ${step.stepOrder} · ${step.roleName}`);
  return <div className="space-y-5" dir="rtl">
    <FormManagerHeader form={{ ...data.form, _count: { submissions: k.submissions } } as any}/>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div><p className="text-sm font-semibold text-gray-900 dark:text-white">تحلیل عمیق فرم</p><p className="mt-1 text-xs text-gray-500">KPI، SLA، گردش تأیید، گلوگاه و تحلیل خودکار فیلدها از داده واقعی</p></div>
      <div className="flex rounded-xl bg-gray-50 p-1 dark:bg-gray-800">{(["7d","30d","90d"] as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${range===item?"bg-white text-blue-600 shadow-sm dark:bg-gray-900":"text-gray-500"}`}>{item === "7d" ? "۷ روز" : item === "30d" ? "۳۰ روز" : "۹۰ روز"}</button>)}</div>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi title="کل پاسخ‌ها" value={k.submissions.toLocaleString("fa-IR")} hint={k.submissionsChangePct == null ? "بدون مبنای مقایسه" : `${k.submissionsChangePct >= 0 ? "+" : ""}${k.submissionsChangePct.toLocaleString("fa-IR")}% نسبت به بازه قبل`} icon={FileText}/>
      <Kpi title="نرخ تأیید" value={`${k.approvalRate.toLocaleString("fa-IR")}%`} hint={`${k.approved.toLocaleString("fa-IR")} مورد تأیید`} icon={CheckCircle2}/>
      <Kpi title="نرخ رد" value={`${k.rejectionRate.toLocaleString("fa-IR")}%`} hint={`${k.rejected.toLocaleString("fa-IR")} مورد رد`} icon={XCircle}/>
      <Kpi title="میانگین زمان تصمیم" value={formatHours(k.averageProcessingHours)} hint={`میانه: ${formatHours(k.medianProcessingHours)}`} icon={TimerReset}/>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi title="رعایت SLA" value={data.sla.complianceRate == null ? "—" : `${data.sla.complianceRate.toLocaleString("fa-IR")}%`} hint={`${data.sla.compliant.toLocaleString("fa-IR")} مورد در SLA`} icon={ShieldCheck}/>
      <Kpi title="نقض SLA" value={data.sla.breached.toLocaleString("fa-IR")} hint={data.sla.averageOverdueHours == null ? "بدون تأخیر" : `میانگین تأخیر ${formatHours(data.sla.averageOverdueHours)}`} icon={AlertTriangle}/>
      <Kpi title="هدف SLA فرم" value={data.sla.targetHours == null ? "تعریف نشده" : formatHours(data.sla.targetHours)} hint="از ثبت پاسخ تا تصمیم نهایی" icon={TimerReset}/>
      <Kpi title="موارد قابل ارزیابی" value={data.sla.eligible.toLocaleString("fa-IR")} hint="فقط پاسخ‌های دارای گردش تأیید" icon={FileText}/>
    </div>

    <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">تنظیم SLA فرم و مراحل</h3><p className="mt-1 text-xs text-gray-500">SLA کلی از ثبت پاسخ تا تصمیم نهایی و SLA مرحله‌ای برای زمان انتظار هر Approval Step.</p></div><button onClick={saveSla} disabled={savingSla} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save size={16}/>{savingSla ? "در حال ذخیره" : "ذخیره SLA"}</button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="mb-2 block font-medium">SLA کلی فرم</span><div className="flex items-center gap-2"><input type="number" min={1} value={slaHours} onChange={e=>setSlaHours(e.target.value)} placeholder="مثلاً 24" className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"/><span className="text-xs text-gray-500">ساعت</span></div></label>{data.sla.steps.map(step=><label key={step.stepId} className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"><span className="mb-2 block font-medium">مرحله {step.stepOrder.toLocaleString("fa-IR")} · {step.roleName}</span><div className="flex items-center gap-2"><input type="number" min={1} value={stepSla[step.stepId] ?? ""} onChange={e=>setStepSla(v=>({...v,[step.stepId]:e.target.value}))} placeholder="بدون SLA" className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"/><span className="text-xs text-gray-500">ساعت</span></div></label>)}</div>
    </section>

    {data.sla.targetHours != null && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="روند SLA فرم" subtitle="رعایت SLA در مقابل موارد نقض‌شده"><AnalyticsLineChart labels={data.sla.trend.map(x=>new Date(x.date).toLocaleDateString("fa-IR",{month:"short",day:"numeric"}))} series={[{name:"در SLA",data:data.sla.trend.map(x=>x.compliant)},{name:"نقض SLA",data:data.sla.trend.map(x=>x.breached)}]}/></ChartCard>
      <ChartCard title="SLA مراحل تأیید" subtitle="درصد رعایت هدف زمانی هر مرحله"><AnalyticsBarChart labels={data.sla.steps.filter(x=>x.targetHours!=null).map(x=>`مرحله ${x.stepOrder} · ${x.roleName}`)} series={[{name:"درصد رعایت",data:data.sla.steps.filter(x=>x.targetHours!=null).map(x=>x.complianceRate ?? 0)}]}/></ChartCard>
    </div>}

    {data.sla.breaches.length > 0 && <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white dark:border-rose-500/20 dark:bg-gray-900"><div className="border-b border-rose-100 p-4 dark:border-rose-500/20"><h3 className="font-semibold text-rose-700 dark:text-rose-300">پاسخ‌های نقض‌کننده SLA</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-rose-50/60 text-gray-500 dark:bg-rose-500/5"><tr><th className="p-3 text-right">Submission</th><th className="p-3">وضعیت</th><th className="p-3">SLA</th><th className="p-3">تأخیر</th><th className="p-3">موعد</th></tr></thead><tbody>{data.sla.breaches.map(x=><tr key={x.submissionId} className="border-t border-gray-100 dark:border-gray-800"><td className="p-3 font-mono text-xs">{x.submissionId.slice(0,8)}…</td><td className="p-3 text-center">{x.status}</td><td className="p-3 text-center">{formatHours(x.targetHours)}</td><td className="p-3 text-center text-rose-600">{formatHours(x.overdueHours)}</td><td className="p-3 text-center">{new Date(x.dueAt).toLocaleString("fa-IR")}</td></tr>)}</tbody></table></div></section>}

    {data.bottleneck && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20}/><div><p className="font-semibold text-amber-900 dark:text-amber-200">گلوگاه فعلی گردش تأیید</p><p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/70">مرحله {data.bottleneck.stepOrder} ({data.bottleneck.roleName}) با میانگین انتظار {formatHours(data.bottleneck.averageWaitHours)} بیشترین زمان پردازش را دارد.</p></div></div>}

    <InsightPanel insights={data.insights} anomalies={data.anomalies} title="بینش‌ها و هشدارهای فرم"/>

    <AiAnalyticsPanel title="AI Analytics این فرم" onSummarize={async()=> (await formsApi.getAiSummary(id, range)).data} onAsk={async(q)=> (await formsApi.askAnalytics(id, q, range)).data}/>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2"><ChartCard title="روند ثبت پاسخ" subtitle="تعداد پاسخ‌های ثبت‌شده در بازه انتخابی"><AnalyticsLineChart labels={chartLabels} series={[{ name: "پاسخ", data: data.trend.map(x => x.count) }]}/></ChartCard></div>
      <ChartCard title="وضعیت گردش تأیید" subtitle="تفکیک پاسخ‌ها بر اساس وضعیت"><AnalyticsDonut data={data.statusDistribution.filter(x => x.count > 0).map(x => ({ name: statusLabels[x.status] ?? x.status, value: x.count }))}/></ChartCard>
    </div>

    {data.approvalFunnel.length > 0 ? <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Approval Funnel" subtitle="تعداد پاسخ‌هایی که به هر مرحله رسیده‌اند"><AnalyticsBarChart horizontal labels={funnelLabels} series={[{ name: "ورود", data: data.approvalFunnel.map(x => x.entered) }, { name: "تأیید", data: data.approvalFunnel.map(x => x.approved) }]} height={Math.max(280, data.approvalFunnel.length * 70)}/></ChartCard>
        <ChartCard title="زمان انتظار مراحل" subtitle="میانگین زمان از ورود به مرحله تا تصمیم"><AnalyticsBarChart horizontal labels={funnelLabels} series={[{ name: "ساعت", data: data.approvalFunnel.map(x => x.averageWaitHours ?? 0) }]} height={Math.max(280, data.approvalFunnel.length * 70)}/></ChartCard>
      </div>
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800"><h3 className="font-semibold text-gray-900 dark:text-white">جزئیات گردش تأیید</h3></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800"><tr><th className="p-3">مرحله</th><th className="p-3">نقش</th><th className="p-3">ورود</th><th className="p-3">تأیید</th><th className="p-3">رد</th><th className="p-3">در انتظار</th><th className="p-3">نرخ عبور</th><th className="p-3">زمان انتظار</th></tr></thead><tbody>{data.approvalFunnel.map(step => <tr key={step.stepId} className="border-t border-gray-100 dark:border-gray-800"><td className="p-3 font-medium">{step.stepOrder.toLocaleString("fa-IR")}</td><td className="p-3">{step.roleName}</td><td className="p-3">{step.entered.toLocaleString("fa-IR")}</td><td className="p-3 text-emerald-600">{step.approved.toLocaleString("fa-IR")}</td><td className="p-3 text-rose-600">{step.rejected.toLocaleString("fa-IR")}</td><td className="p-3 text-amber-600">{step.pending.toLocaleString("fa-IR")}</td><td className="p-3">{step.conversionRate.toLocaleString("fa-IR")}%</td><td className="p-3">{formatHours(step.averageWaitHours)}</td></tr>)}</tbody></table></div>
      </section>
    </> : <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">برای این فرم گردش تأیید تعریف نشده است؛ بنابراین Funnel و Bottleneck مرحله‌ای وجود ندارد.</div>}

    <div className="flex items-center gap-2 pt-2"><Gauge size={20} className="text-blue-600"/><div><h2 className="font-bold text-gray-900 dark:text-white">تحلیل فیلدهای فرم</h2><p className="text-xs text-gray-500">برای هر فیلد متناسب با نوع آن، تکمیل، توزیع و آمار عددی محاسبه می‌شود.</p></div></div>
    {data.fieldAnalytics.length ? <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{data.fieldAnalytics.map(field => <FieldCard key={field.key} field={field}/>)}</div> : <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700">فیلد قابل تحلیل در Schema این فرم پیدا نشد.</div>}

    {loading && <div className="fixed bottom-6 left-6 rounded-full bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"><Clock3 className="ml-1 inline animate-spin" size={13}/> در حال بروزرسانی</div>}
  </div>;
}
