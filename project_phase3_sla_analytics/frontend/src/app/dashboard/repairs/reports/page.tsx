"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Loader2, Repeat2, Save, ShieldCheck, TimerReset, Wrench } from "lucide-react";
import { repairsApi, type RepairAnalytics, type RepairSlaPolicy } from "@/lib/api/repairs";
import ChartCard from "@/components/charts/ChartCard";
import AnalyticsLineChart from "@/components/charts/AnalyticsLineChart";
import AnalyticsDonut from "@/components/charts/AnalyticsDonut";
import AnalyticsBarChart from "@/components/charts/AnalyticsBarChart";

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
  const [slaPolicies, setSlaPolicies] = useState<RepairSlaPolicy[]>([]);
  const [savingSla, setSavingSla] = useState(false);
  const [slaMessage, setSlaMessage] = useState("");

  useEffect(() => {
    let active = true; setLoading(true);
    Promise.all([repairsApi.getAnalytics(range), repairsApi.getSlaPolicies()])
      .then(([analytics, policies]) => {
        if (!active) return;
        setData(analytics.data);
        const existing = policies.data;
        setSlaPolicies((["IN_HOUSE", "ON_SITE"] as const).map(type => existing.find(x => x.type === type) ?? { type, targetHours: 24, isActive: false }));
      })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  const saveSlaPolicies = async () => {
    setSavingSla(true); setSlaMessage("");
    try {
      await repairsApi.updateSlaPolicies(slaPolicies.map(x => ({ ...x, targetHours: Math.max(1, Number(x.targetHours) || 1) })));
      setSlaMessage("تنظیمات SLA ذخیره شد.");
      const refreshed = await repairsApi.getAnalytics(range);
      setData(refreshed.data);
    } catch { setSlaMessage("ذخیره تنظیمات SLA ناموفق بود."); }
    finally { setSavingSla(false); }
  };

  const labels = useMemo(() => data?.trend.map(x => new Date(x.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })) ?? [], [data]);

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-bold text-gray-900 dark:text-white md:text-xl">گزارش‌ها و تحلیل عمیق تعمیرات</h1><p className="mt-1 text-sm text-gray-600 dark:text-white/60">KPI، Aging، SLA، زمان وضعیت‌ها، عملکرد تکنسین و تحلیل مراجعه‌ها</p></div><div className="flex items-center gap-2"><div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">{(["7d","30d","90d"] as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${range===item?"bg-white text-cyan-700 shadow-sm dark:bg-gray-900 dark:text-cyan-300":"text-gray-500"}`}>{item === "7d" ? "۷ روز" : item === "30d" ? "۳۰ روز" : "۹۰ روز"}</button>)}</div><Link href="/dashboard/repairs" className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">داشبورد تعمیرات</Link></div></div>

    {loading && !data ? <div className="flex justify-center py-24"><Loader2 className="animate-spin text-cyan-500"/></div> : !data ? <div className="py-20 text-center text-gray-500">داده تحلیلی تعمیرات در دسترس نیست.</div> : <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard title="کل پرونده‌های ثبت‌شده" value={data.kpis.total.toLocaleString("fa-IR")} hint={data.kpis.totalChangePct == null ? "بدون مبنای مقایسه" : `${data.kpis.totalChangePct >= 0 ? "+" : ""}${data.kpis.totalChangePct.toLocaleString("fa-IR")}% نسبت به بازه قبل`} icon={ClipboardList}/>
        <KpiCard title="پرونده‌های باز" value={data.kpis.open.toLocaleString("fa-IR")} hint={`${data.kpis.completed.toLocaleString("fa-IR")} تکمیل‌شده در بازه`} icon={Wrench}/>
        <KpiCard title="میانگین MTTR" value={data.kpis.mttrDays == null ? "—" : `${data.kpis.mttrDays.toLocaleString("fa-IR")} روز`} hint="از شروع تعمیر تا تکمیل" icon={TimerReset}/>
        <KpiCard title="First Visit Fix" value={data.visits.firstVisitFixRate == null ? "—" : `${data.visits.firstVisitFixRate.toLocaleString("fa-IR")}%`} hint={data.visits.secondVisitRate == null ? "بدون مراجعه ثبت‌شده" : `مراجعه دوم: ${data.visits.secondVisitRate.toLocaleString("fa-IR")}%`} icon={Repeat2}/>
      </div>

      <section className="rounded-2xl border border-cyan-100 bg-white/80 p-4 shadow-sm dark:border-cyan-500/20 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><ShieldCheck size={18} className="text-cyan-600"/>تنظیم SLA تعمیرات</h2><p className="mt-1 text-xs text-gray-500">برای هر نوع تعمیر زمان هدف را مستقل تعریف کنید. Policy غیرفعال در محاسبات جدید استفاده نمی‌شود.</p></div><button onClick={saveSlaPolicies} disabled={savingSla} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingSla ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}ذخیره SLA</button></div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{slaPolicies.map((policy, idx) => <div key={policy.type} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{typeLabels[policy.type]}</p><p className="text-xs text-gray-500">حداکثر زمان از ثبت تا تکمیل</p></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={policy.isActive} onChange={(e) => setSlaPolicies(prev => prev.map((x,i) => i===idx ? {...x,isActive:e.target.checked}:x))}/>فعال</label></div><div className="mt-3 flex items-center gap-2"><input type="number" min={1} disabled={!policy.isActive} value={policy.targetHours} onChange={(e) => setSlaPolicies(prev => prev.map((x,i) => i===idx ? {...x,targetHours:Math.max(1,Number(e.target.value)||1)}:x))} className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"/><span className="text-xs text-gray-500">ساعت</span></div></div>)}</div>
        {slaMessage && <p className="mt-3 text-xs text-gray-500">{slaMessage}</p>}
      </section>

      {data.sla.configured ? <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><KpiCard title="SLA Compliance" value={data.sla.complianceRate == null ? "—" : `${data.sla.complianceRate.toLocaleString("fa-IR")}%`} hint={`${data.sla.assessed.toLocaleString("fa-IR")} پرونده ارزیابی‌شده`} icon={ShieldCheck}/><KpiCard title="داخل SLA" value={data.sla.within.toLocaleString("fa-IR")} icon={CheckCircle2}/><KpiCard title="نقض SLA" value={data.sla.breached.toLocaleString("fa-IR")} icon={AlertTriangle}/><KpiCard title="میانگین تأخیر SLA" value={data.sla.averageOverdueHours == null ? "—" : `${data.sla.averageOverdueHours.toLocaleString("fa-IR")} ساعت`} hint="فقط پرونده‌های نقض‌شده" icon={Clock3}/></div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="SLA بر اساس نوع تعمیر" subtitle="درصد رعایت زمان هدف"><AnalyticsBarChart labels={data.sla.byType.map(x => typeLabels[x.type] ?? x.type)} series={[{ name: "رعایت SLA", data: data.sla.byType.map(x => x.complianceRate ?? 0) }]}/></ChartCard><ChartCard title="روند SLA" subtitle="درصد رعایت SLA پرونده‌های ثبت‌شده در هر روز"><AnalyticsLineChart labels={labels} series={[{ name: "SLA %", data: data.sla.trend.map(x => x.complianceRate ?? 0) }]}/></ChartCard></div>
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/70 dark:border-white/10 dark:bg-white/5"><div className="border-b border-black/5 p-4 font-semibold dark:border-white/10">جزئیات SLA بر اساس نوع تعمیر</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800"><tr><th className="p-3">نوع</th><th className="p-3">ارزیابی</th><th className="p-3">داخل SLA</th><th className="p-3">نقض</th><th className="p-3">نرخ رعایت</th><th className="p-3">میانگین تأخیر</th></tr></thead><tbody>{data.sla.byType.map(x => <tr key={x.type} className="border-t border-black/5 dark:border-white/10"><td className="p-3 font-medium">{typeLabels[x.type]}</td><td className="p-3">{x.total.toLocaleString("fa-IR")}</td><td className="p-3 text-emerald-600">{x.within.toLocaleString("fa-IR")}</td><td className="p-3 text-rose-600">{x.breached.toLocaleString("fa-IR")}</td><td className="p-3">{x.complianceRate == null ? "—" : `${x.complianceRate.toLocaleString("fa-IR")}%`}</td><td className="p-3">{x.averageOverdueHours == null ? "—" : `${x.averageOverdueHours.toLocaleString("fa-IR")} ساعت`}</td></tr>)}</tbody></table></div></div>
        {data.sla.byTechnician.length > 0 && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="SLA تکنسین‌ها" subtitle="درصد رعایت SLA پرونده‌های واگذار شده"><AnalyticsBarChart horizontal labels={data.sla.byTechnician.map(x => x.name)} series={[{ name: "رعایت SLA", data: data.sla.byTechnician.map(x => x.complianceRate ?? 0) }]} height={Math.max(280, data.sla.byTechnician.length * 48)}/></ChartCard><div className="overflow-hidden rounded-2xl border border-black/5 bg-white/70 dark:border-white/10 dark:bg-white/5"><div className="border-b border-black/5 p-4 font-semibold dark:border-white/10">SLA به تفکیک تکنسین</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800"><tr><th className="p-3">تکنسین</th><th className="p-3">پرونده</th><th className="p-3">نقض</th><th className="p-3">رعایت</th><th className="p-3">میانگین تأخیر</th></tr></thead><tbody>{data.sla.byTechnician.map(x => <tr key={x.id} className="border-t border-black/5 dark:border-white/10"><td className="p-3 font-medium">{x.name}</td><td className="p-3">{x.total.toLocaleString("fa-IR")}</td><td className="p-3 text-rose-600">{x.breached.toLocaleString("fa-IR")}</td><td className="p-3 text-emerald-600">{x.complianceRate == null ? "—" : `${x.complianceRate.toLocaleString("fa-IR")}%`}</td><td className="p-3">{x.averageOverdueHours == null ? "—" : `${x.averageOverdueHours.toLocaleString("fa-IR")} ساعت`}</td></tr>)}</tbody></table></div></div></div>}
      </section> : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">SLA تعمیرات هنوز فعال نشده است. از بخش بالا حداقل یک Policy را فعال و ذخیره کنید.</div>}

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
