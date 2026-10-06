"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2, Repeat2, Save, ShieldCheck, TimerReset, Wrench } from "lucide-react";
import { repairsApi, type RepairAnalytics, type RepairSlaPolicy } from "@/lib/api/repairs";
import ChartCard from "@/components/charts/ChartCard";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import AnalyticsDonut from "@/components/charts/AnalyticsDonut";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";
import InsightPanel from "@/components/analytics/InsightPanel";
import AiAnalyticsPanel from "@/components/analytics/AiAnalyticsPanel";

type Range = "7d" | "30d" | "90d";

const statusLabels: Record<string, string> = {
  REGISTERED: "ثبت شده", WAITING_REVIEW: "در انتظار بررسی", WAITING_COST_APPROVAL: "در انتظار تأیید هزینه", APPROVED: "تأیید شده", REJECTED: "رد شده", IN_REPAIR: "در حال تعمیر", QC: "کنترل کیفیت", READY_FOR_DELIVERY: "آماده تحویل", DELIVERED: "تحویل شده", CLOSED: "بسته شده", CANCELED: "لغو شده", NO_REPAIR_REQUIRED: "بدون نیاز به تعمیر",
};
const typeLabels: Record<string, string> = { IN_HOUSE: "تعمیر در شرکت", ON_SITE: "تعمیر در محل" };
const visitLabels: Record<string, string> = { REPAIRED: "تعمیر شد", NEED_SECOND_VISIT: "نیاز به مراجعه دوم", NEED_PART: "نیاز به قطعه", CUSTOMER_ABSENT: "عدم حضور مشتری", CANCELED: "لغو" };

function KpiCard({ title, value, hint, icon: Icon }: { title: string; value: string; hint?: string; icon: typeof Wrench }) {
  return <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-gray-600 dark:text-white/60 md:text-sm">{title}</p><p className="mt-2 text-xl font-bold text-gray-900 dark:text-white md:text-2xl">{value}</p>{hint && <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{hint}</p>}</div><div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600 dark:bg-cyan-500/10"><Icon size={18}/></div></div></div>;
}

export default function RepairsReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<RepairAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<RepairSlaPolicy[]>([]);
  const [savingSla, setSavingSla] = useState(false);

  useEffect(() => {
    let active = true; setLoading(true);
    Promise.all([repairsApi.getAnalytics(range), repairsApi.getSlaPolicies()]).then(([analytics, sla]) => { if (active) { setData(analytics.data); setPolicies(sla.data); } }).catch(() => { if (active) setData(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  const savePolicies = async () => {
    setSavingSla(true);
    try {
      const result = await repairsApi.updateSlaPolicies(policies.filter(p => p.targetHours != null).map(p => ({ type: p.type, targetHours: p.targetHours!, isActive: p.isActive })));
      setPolicies(result.data);
      const refreshed = await repairsApi.getAnalytics(range); setData(refreshed.data);
    } finally { setSavingSla(false); }
  };

  const labels = useMemo(() => data?.trend.map(x => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })) ?? [], [data]);

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-bold text-gray-900 dark:text-white md:text-xl">گزارش‌ها و تحلیل عمیق تعمیرات</h1><p className="mt-1 text-sm text-gray-600 dark:text-white/60">KPI، SLA، Aging، زمان وضعیت‌ها، عملکرد تکنسین و تحلیل مراجعه‌ها</p></div><div className="flex items-center gap-2"><div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">{(["7d","30d","90d"] as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${range===item?"bg-white text-cyan-700 shadow-sm dark:bg-gray-900 dark:text-cyan-300":"text-gray-500"}`}>{item === "7d" ? "۷ روز" : item === "30d" ? "۳۰ روز" : "۹۰ روز"}</button>)}</div><Link href="/dashboard/repairs" className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">داشبورد تعمیرات</Link></div></div>

    {loading && !data ? <div className="flex justify-center py-24"><Loader2 className="animate-spin text-cyan-500"/></div> : !data ? <div className="py-20 text-center text-gray-500">داده تحلیلی تعمیرات در دسترس نیست.</div> : <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard title="کل پرونده‌های ثبت‌شده" value={data.kpis.total.toLocaleString("fa-IR")} hint={data.kpis.totalChangePct == null ? "بدون مبنای مقایسه" : `${data.kpis.totalChangePct >= 0 ? "+" : ""}${data.kpis.totalChangePct.toLocaleString("fa-IR")}% نسبت به بازه قبل`} icon={ClipboardList}/>
        <KpiCard title="پرونده‌های باز" value={data.kpis.open.toLocaleString("fa-IR")} hint={`${data.kpis.completed.toLocaleString("fa-IR")} تکمیل‌شده در بازه`} icon={Wrench}/>
        <KpiCard title="میانگین MTTR" value={data.kpis.mttrDays == null ? "—" : `${data.kpis.mttrDays.toLocaleString("fa-IR")} روز`} hint="از شروع تعمیر تا تکمیل" icon={TimerReset}/>
        <KpiCard title="First Visit Fix" value={data.visits.firstVisitFixRate == null ? "—" : `${data.visits.firstVisitFixRate.toLocaleString("fa-IR")}%`} hint={data.visits.secondVisitRate == null ? "بدون مراجعه ثبت‌شده" : `مراجعه دوم: ${data.visits.secondVisitRate.toLocaleString("fa-IR")}%`} icon={Repeat2}/>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard title="رعایت SLA" value={data.sla.complianceRate == null ? "—" : `${data.sla.complianceRate.toLocaleString("fa-IR")}%`} hint={`${data.sla.compliant.toLocaleString("fa-IR")} مورد در SLA`} icon={ShieldCheck}/>
        <KpiCard title="نقض SLA" value={data.sla.breached.toLocaleString("fa-IR")} hint={data.sla.averageOverdueHours == null ? "بدون تأخیر" : `میانگین تأخیر ${data.sla.averageOverdueHours.toLocaleString("fa-IR")} ساعت`} icon={AlertTriangle}/>
        <KpiCard title="در معرض نقض" value={data.sla.atRisk.toLocaleString("fa-IR")} hint="کمتر از ۲۵٪ زمان SLA باقی مانده" icon={TimerReset}/>
        <KpiCard title="موارد دارای SLA" value={data.sla.eligible.toLocaleString("fa-IR")} hint="لغو و رد از ارزیابی خارج هستند" icon={ClipboardList}/>
      </div>

      <InsightPanel insights={data.insights} anomalies={data.anomalies} title="بینش‌ها و هشدارهای تعمیرات"/>

      <AiAnalyticsPanel title="AI Analytics تعمیرات" onSummarize={async()=> (await repairsApi.getAiSummary(range)).data} onAsk={async(q)=> (await repairsApi.askAnalytics(q, range)).data}/>

      <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">تنظیم SLA تعمیرات</h3><p className="mt-1 text-xs text-gray-500">هدف زمانی بر اساس نوع تعمیر؛ برای پرونده‌های جدید snapshot می‌شود.</p></div><button onClick={savePolicies} disabled={savingSla} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save size={16}/>{savingSla ? "در حال ذخیره" : "ذخیره SLA"}</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{policies.map((p,i)=><div key={p.type} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{typeLabels[p.type]}</p><p className="text-xs text-gray-500">حداکثر زمان از ثبت تا تکمیل</p></div><div className="flex items-center gap-2"><input type="number" min={1} value={p.targetHours ?? ""} onChange={e=>setPolicies(rows=>rows.map((x,idx)=>idx===i?{...x,targetHours:e.target.value?Number(e.target.value):null}:x))} className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center dark:border-gray-700 dark:bg-gray-900"/><span className="text-xs text-gray-500">ساعت</span><input type="checkbox" checked={p.isActive} onChange={e=>setPolicies(rows=>rows.map((x,idx)=>idx===i?{...x,isActive:e.target.checked}:x))}/></div></div></div>)}</div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="روند SLA" subtitle="پرونده‌های در SLA در مقابل موارد نقض‌شده"><AnalyticsLineChart labels={data.sla.trend.map(x => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }))} series={[{ name: "در SLA", data: data.sla.trend.map(x=>x.compliant) }, { name: "نقض SLA", data: data.sla.trend.map(x=>x.breached) }]}/></ChartCard>
        <ChartCard title="SLA بر اساس نوع تعمیر" subtitle="درصد رعایت SLA و تعداد موارد"><AnalyticsBarChart labels={data.sla.byType.map(x=>typeLabels[x.type] ?? x.type)} series={[{ name: "درصد رعایت", data: data.sla.byType.map(x=>x.complianceRate ?? 0) }]}/></ChartCard>
      </div>

      {data.sla.breaches.length > 0 && <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white/80 dark:border-rose-500/20 dark:bg-white/5"><div className="border-b border-rose-100 p-4 dark:border-rose-500/20"><h3 className="font-semibold text-rose-700 dark:text-rose-300">پرونده‌های نقض SLA</h3><p className="mt-1 text-xs text-gray-500">بیشترین تأخیرها برای Drill-down عملیاتی</p></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-rose-50/60 text-gray-500 dark:bg-rose-500/5"><tr><th className="p-3 text-right">پرونده</th><th className="p-3">دستگاه</th><th className="p-3">نوع</th><th className="p-3">SLA</th><th className="p-3">تأخیر</th><th className="p-3">تکنسین</th></tr></thead><tbody>{data.sla.breaches.map(x=><tr key={x.repairId} className="border-t border-black/5 dark:border-white/10"><td className="p-3"><span className="font-medium text-cyan-700">{x.caseNumber}</span></td><td className="p-3">{x.deviceTitle}</td><td className="p-3 text-center">{typeLabels[x.type]}</td><td className="p-3 text-center">{x.targetHours.toLocaleString("fa-IR")} ساعت</td><td className="p-3 text-center text-rose-600">{x.overdueHours.toLocaleString("fa-IR")} ساعت</td><td className="p-3 text-center">{x.technician ?? "—"}</td></tr>)}</tbody></table></div></section>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3"><div className="xl:col-span-2"><ChartCard title="روند تعمیرات" subtitle="پرونده‌های جدید در مقابل تکمیل‌شده‌ها"><AnalyticsLineChart labels={labels} series={[{ name: "ثبت‌شده", data: data.trend.map(x => x.created) }, { name: "تکمیل‌شده", data: data.trend.map(x => x.completed) }]}/></ChartCard></div><ChartCard title="نوع تعمیر" subtitle="تعمیر در شرکت و در محل"><AnalyticsDonut data={data.typeDistribution.filter(x => x.count > 0).map(x => ({ name: typeLabels[x.type] ?? x.type, value: x.count }))}/></ChartCard></div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Aging پرونده‌های باز" subtitle="سن تمام پرونده‌هایی که تا پایان بازه هنوز باز هستند"><AnalyticsBarChart labels={data.aging.map(x => x.label)} series={[{ name: "پرونده", data: data.aging.map(x => x.count) }]}/></ChartCard>
        <ChartCard title="مدت ماندگاری در وضعیت‌ها" subtitle="میانگین ساعت صرف‌شده در هر مرحله از چرخه تعمیر"><AnalyticsBarChart horizontal labels={data.statusDuration.map(x => statusLabels[x.status] ?? x.status)} series={[{ name: "ساعت", data: data.statusDuration.map(x => x.averageHours) }]} height={Math.max(320, data.statusDuration.length * 44)}/></ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="نتیجه مراجعه تکنسین" subtitle={`${data.visits.total.toLocaleString("fa-IR")} مراجعه ثبت‌شده`}><AnalyticsDonut data={data.visits.resultDistribution.filter(x => x.count > 0).map(x => ({ name: visitLabels[x.result] ?? x.result, value: x.count }))}/></ChartCard>
        <ChartCard title="بار کاری تکنسین‌ها" subtitle="پرونده‌های واگذار شده و باز در بازه"><AnalyticsBarChart horizontal stacked labels={data.technicians.map(x => x.name)} series={[{ name: "تکمیل", data: data.technicians.map(x => x.completed) }, { name: "باز", data: data.technicians.map(x => x.open) }]} height={Math.max(300, data.technicians.length * 50)}/></ChartCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-black/5 p-4 dark:border-white/10"><h3 className="font-semibold text-gray-900 dark:text-white">عملکرد تکنسین‌ها</h3><p className="mt-1 text-xs text-gray-500">برای بررسی بارکاری و کیفیت عملیات؛ بدون رتبه‌بندی کلی افراد</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800"><tr><th className="p-3">تکنسین</th><th className="p-3">واگذار شده</th><th className="p-3">باز</th><th className="p-3">تکمیل</th><th className="p-3">MTTR</th><th className="p-3">مراجعه</th><th className="p-3">First Visit Fix</th><th className="p-3">Second Visit</th></tr></thead><tbody>{data.technicians.map(t => <tr key={t.id} className="border-t border-black/5 dark:border-white/10"><td className="p-3 font-medium text-gray-900 dark:text-white">{t.name}</td><td className="p-3">{t.assigned.toLocaleString("fa-IR")}</td><td className="p-3 text-amber-600">{t.open.toLocaleString("fa-IR")}</td><td className="p-3 text-emerald-600">{t.completed.toLocaleString("fa-IR")}</td><td className="p-3">{t.mttrDays == null ? "—" : `${t.mttrDays.toLocaleString("fa-IR")} روز`}</td><td className="p-3">{t.visits.toLocaleString("fa-IR")}</td><td className="p-3">{t.firstVisitFixRate == null ? "—" : `${t.firstVisitFixRate.toLocaleString("fa-IR")}%`}</td><td className="p-3">{t.secondVisitRate == null ? "—" : `${t.secondVisitRate.toLocaleString("fa-IR")}%`}</td></tr>)}</tbody></table></div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="توزیع وضعیت پرونده‌ها" subtitle="وضعیت فعلی پرونده‌های ثبت‌شده در بازه"><AnalyticsDonut data={data.statusDistribution.filter(x => x.count > 0).map(x => ({ name: statusLabels[x.status] ?? x.status, value: x.count }))}/></ChartCard><section className="rounded-2xl border border-black/5 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"><h3 className="font-semibold text-gray-900 dark:text-white">خلاصه زمان عملیات</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-cyan-50 p-4 dark:bg-cyan-500/10"><p className="text-xs text-cyan-700 dark:text-cyan-300">زمان شروع متوسط</p><p className="mt-1 text-xl font-bold">{data.kpis.timeToStartHours == null ? "—" : `${data.kpis.timeToStartHours.toLocaleString("fa-IR")} ساعت`}</p></div><div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-500/10"><p className="text-xs text-violet-700 dark:text-violet-300">Lead Time متوسط</p><p className="mt-1 text-xl font-bold">{data.kpis.leadTimeDays == null ? "—" : `${data.kpis.leadTimeDays.toLocaleString("fa-IR")} روز`}</p></div></div></section></div>
      {loading && <div className="fixed bottom-6 left-6 rounded-full bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"><Loader2 className="ml-1 inline animate-spin" size={13}/> در حال بروزرسانی</div>}
    </>}
  </div>;
}
