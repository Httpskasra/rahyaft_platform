"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Gauge, Loader2, ShieldCheck, TimerReset, XCircle } from "lucide-react";
import { formsApi, type FormAnalytics, type FormFieldAnalytics } from "@/lib/api/forms";
import { FormManagerHeader } from "./FormManagerHeader";
import ChartCard from "@/components/charts/ChartCard";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import AnalyticsDonut from "@/components/charts/AnalyticsDonut";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";

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

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await formsApi.getAnalytics(id, range); setData(response.data); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, [id, range]);
  useEffect(() => { load(); }, [load]);

  const chartLabels = useMemo(() => data?.trend.map((x) => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })) ?? [], [data]);
  const statusLabels: Record<string, string> = { APPROVED: "تأیید شده", REJECTED: "رد شده", PENDING: "در انتظار", NO_WORKFLOW: "بدون گردش تأیید" };

  if (loading && !data) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500"/></div>;
  if (!data) return <div className="py-20 text-center text-gray-500">داده تحلیلی فرم در دسترس نیست.</div>;

  const k = data.kpis;
  const funnelLabels = data.approvalFunnel.map(step => `مرحله ${step.stepOrder} · ${step.roleName}`);
  return <div className="space-y-5" dir="rtl">
    <FormManagerHeader form={{ ...data.form, _count: { submissions: k.submissions } } as any}/>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div><p className="text-sm font-semibold text-gray-900 dark:text-white">تحلیل عمیق فرم</p><p className="mt-1 text-xs text-gray-500">KPI، گردش تأیید، گلوگاه و تحلیل خودکار فیلدها از داده واقعی</p></div>
      <div className="flex rounded-xl bg-gray-50 p-1 dark:bg-gray-800">{(["7d","30d","90d"] as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${range===item?"bg-white text-blue-600 shadow-sm dark:bg-gray-900":"text-gray-500"}`}>{item === "7d" ? "۷ روز" : item === "30d" ? "۳۰ روز" : "۹۰ روز"}</button>)}</div>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi title="کل پاسخ‌ها" value={k.submissions.toLocaleString("fa-IR")} hint={k.submissionsChangePct == null ? "بدون مبنای مقایسه" : `${k.submissionsChangePct >= 0 ? "+" : ""}${k.submissionsChangePct.toLocaleString("fa-IR")}% نسبت به بازه قبل`} icon={FileText}/>
      <Kpi title="نرخ تأیید" value={`${k.approvalRate.toLocaleString("fa-IR")}%`} hint={`${k.approved.toLocaleString("fa-IR")} مورد تأیید`} icon={CheckCircle2}/>
      <Kpi title="نرخ رد" value={`${k.rejectionRate.toLocaleString("fa-IR")}%`} hint={`${k.rejected.toLocaleString("fa-IR")} مورد رد`} icon={XCircle}/>
      <Kpi title="میانگین زمان تصمیم" value={formatHours(k.averageProcessingHours)} hint={`میانه: ${formatHours(k.medianProcessingHours)}`} icon={TimerReset}/>
    </div>

    {data.bottleneck && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"><AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20}/><div><p className="font-semibold text-amber-900 dark:text-amber-200">گلوگاه فعلی گردش تأیید</p><p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/70">مرحله {data.bottleneck.stepOrder} ({data.bottleneck.roleName}) با میانگین انتظار {formatHours(data.bottleneck.averageWaitHours)} بیشترین زمان پردازش را دارد.</p></div></div>}
    {data.sla.configured ? <section className="rounded-2xl border border-emerald-100 bg-white p-4 dark:border-emerald-500/20 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><ShieldCheck size={18} className="text-emerald-600"/>SLA گردش تأیید</h3><p className="mt-1 text-xs text-gray-500">رعایت SLA کل فرم و SLA مستقل هر مرحله</p></div>{data.sla.overallTargetHours && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">هدف کل: {formatHours(data.sla.overallTargetHours)}</div>}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi title="SLA Compliance" value={data.sla.complianceRate == null ? "—" : `${data.sla.complianceRate.toLocaleString("fa-IR")}%`} hint={`${data.sla.assessed.toLocaleString("fa-IR")} مورد ارزیابی`} icon={ShieldCheck}/>
        <Kpi title="داخل SLA" value={data.sla.within.toLocaleString("fa-IR")} icon={CheckCircle2}/>
        <Kpi title="نقض SLA" value={data.sla.breached.toLocaleString("fa-IR")} icon={AlertTriangle}/>
        <Kpi title="میانگین تأخیر" value={formatHours(data.sla.averageOverdueHours)} hint="فقط موارد نقض‌شده" icon={Clock3}/>
      </div>
      {data.sla.overallTargetHours && <div className="mt-4"><ChartCard title="روند SLA فرم" subtitle="درصد رعایت SLA کل گردش در هر روز"><AnalyticsLineChart labels={data.sla.trend.map(x => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }))} series={[{ name: "SLA %", data: data.sla.trend.map(x => x.complianceRate ?? 0) }]}/></ChartCard></div>}
      {data.sla.steps.some(x => x.targetHours) && <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="SLA مراحل" subtitle="درصد رعایت SLA هر مرحله"><AnalyticsBarChart horizontal labels={data.sla.steps.filter(x => x.targetHours).map(x => `مرحله ${x.stepOrder} · ${x.roleName}`)} series={[{ name: "درصد رعایت", data: data.sla.steps.filter(x => x.targetHours).map(x => x.complianceRate ?? 0) }]} height={Math.max(260, data.sla.steps.filter(x => x.targetHours).length * 60)}/></ChartCard>
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"><div className="border-b border-gray-100 p-3 text-sm font-semibold dark:border-gray-800">جزئیات SLA مرحله‌ها</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-xs"><thead className="bg-gray-50 text-gray-500 dark:bg-gray-800"><tr><th className="p-3">مرحله</th><th className="p-3">هدف</th><th className="p-3">ارزیابی</th><th className="p-3">نقض</th><th className="p-3">رعایت</th><th className="p-3">میانگین تأخیر</th></tr></thead><tbody>{data.sla.steps.filter(x => x.targetHours).map(x => <tr key={x.stepId} className="border-t border-gray-100 dark:border-gray-800"><td className="p-3">{x.stepOrder.toLocaleString("fa-IR")} · {x.roleName}</td><td className="p-3">{formatHours(x.targetHours)}</td><td className="p-3">{x.assessed.toLocaleString("fa-IR")}</td><td className="p-3 text-rose-600">{x.breached.toLocaleString("fa-IR")}</td><td className="p-3 text-emerald-600">{x.complianceRate == null ? "—" : `${x.complianceRate.toLocaleString("fa-IR")}%`}</td><td className="p-3">{formatHours(x.averageOverdueHours)}</td></tr>)}</tbody></table></div></section>
      </div>}
    </section> : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">برای این فرم هنوز SLA تعریف نشده است. از تب «گردش تأیید» می‌توانید SLA کل و SLA هر مرحله را تنظیم کنید.</div>}


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
