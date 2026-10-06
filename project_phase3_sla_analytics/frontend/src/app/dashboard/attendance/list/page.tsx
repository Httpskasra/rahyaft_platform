/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Download,
  Filter,
  RotateCcw,
  Search,
  TimerReset,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import ChartCard from "@/components/charts/ChartCard";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import {
  attendanceApi,
  AttendanceDailySummary,
  AttendanceReport,
} from "@/lib/api/attendance";
import { cn } from "@/lib/cn";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesToText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} دقیقه`;
  return m ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800", className)} />;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[11px] leading-5 text-gray-400">{hint}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3 text-brand-600 dark:bg-white/5 dark:text-brand-400">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ item }: { item: AttendanceDailySummary }) {
  if (item.incomplete) {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">ثبت ناقص</span>;
  }
  if (item.lateArrival) {
    return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">ورود دیرتر از مبنا</span>;
  }
  return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">عادی</span>;
}

export default function AttendanceAnalyticsPage() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"records" | "people" | "departments">("records");

  async function load(overrides?: { from?: string; to?: string; search?: string; departmentId?: string }) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await attendanceApi.getReport({
        from: overrides ? overrides.from : (from || undefined),
        to: overrides ? overrides.to : (to || undefined),
        search: overrides ? overrides.search : (search.trim() || undefined),
        departmentId: overrides ? overrides.departmentId : (departmentId || undefined),
      });
      setReport(data);
    } catch {
      setError("دریافت گزارش حضور و غیاب با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFrom("");
    setTo("");
    setSearch("");
    setDepartmentId("");
    void load({ from: undefined, to: undefined, search: undefined, departmentId: undefined });
  }

  function exportCsv() {
    if (!report?.records.length) return;
    const header = ["نام", "دپارتمان", "تاریخ", "اولین ورود", "آخرین خروج", "مدت حضور", "تعداد تردد", "وضعیت"];
    const rows = report.records.map((r) => [
      r.userName ?? "",
      r.departmentName ?? "",
      formatDate(r.date),
      formatTime(r.firstCheckIn),
      formatTime(r.lastCheckOut),
      minutesToText(r.workedMinutes),
      String(r.totalEvents),
      r.incomplete ? "ثبت ناقص" : r.lateArrival ? "ورود دیرتر از مبنا" : "عادی",
    ]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const trendOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    legend: { data: ["میانگین ساعت حضور", "افراد دارای تردد"] },
    grid: { left: 18, right: 18, top: 50, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: report?.dailyTrend.map((x) => formatDate(x.date)) ?? [], axisLabel: { rotate: 25 } },
    yAxis: [{ type: "value", name: "ساعت" }, { type: "value", name: "نفر" }],
    series: [
      { name: "میانگین ساعت حضور", type: "line", smooth: true, symbolSize: 7, data: report?.dailyTrend.map((x) => x.averageHours) ?? [] },
      { name: "افراد دارای تردد", type: "bar", yAxisIndex: 1, barMaxWidth: 22, data: report?.dailyTrend.map((x) => x.presentUsers) ?? [] },
    ],
  }), [report]);

  const departmentOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 15, right: 20, top: 20, bottom: 15, containLabel: true },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: report?.departmentStats.map((x) => x.departmentName).reverse() ?? [] },
    series: [{ type: "bar", data: report?.departmentStats.map((x) => x.averageHoursPerDay).reverse() ?? [], barMaxWidth: 20, name: "میانگین ساعت حضور" }],
  }), [report]);

  const alertsOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    legend: { data: ["ورود دیرتر", "خروج زودتر", "ثبت ناقص"] },
    grid: { left: 15, right: 20, top: 45, bottom: 15, containLabel: true },
    xAxis: { type: "category", data: report?.departmentStats.map((x) => x.departmentName) ?? [] },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      { type: "bar", name: "ورود دیرتر", stack: "issues", data: report?.departmentStats.map((x) => x.lateCount) ?? [] },
      { type: "bar", name: "خروج زودتر", stack: "issues", data: report?.departmentStats.map((x) => x.earlyDepartureCount) ?? [] },
      { type: "bar", name: "ثبت ناقص", stack: "issues", data: report?.departmentStats.map((x) => x.incompleteCount) ?? [] },
    ],
  }), [report]);

  return (
    <div dir="rtl" lang="fa" className="mx-auto max-w-[1500px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <BarChart3 size={15} /> مرکز گزارش حضور و غیاب
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-3xl">داشبورد حضور و غیاب</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            جستجو و تحلیل تردد بر اساس روز، شخص و دپارتمان؛ همراه با روندها، شاخص‌های کلیدی و موارد نیازمند بررسی.
          </p>
        </div>
        <button onClick={exportCsv} disabled={!report?.records.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
          <Download size={16} /> خروجی CSV گزارش
        </button>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white"><Filter size={16} /> فیلتر و جستجوی گزارش</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">نام شخص</label>
            <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="مثلاً علی رضایی" className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 py-2.5 pr-9 pl-3 text-sm outline-none transition focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white" /></div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">دپارتمان</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-white/10 dark:bg-gray-900 dark:text-white">
              <option value="">همه دپارتمان‌ها</option>
              {report?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="mb-1.5 block text-xs font-medium text-gray-500">از تاریخ</label><PersianDatePicker value={from} valueMode="gregorian-date" onChange={setFrom} placeholder="شروع بازه" className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-gray-500">تا تاریخ</label><PersianDatePicker value={to} valueMode="gregorian-date" onChange={setTo} placeholder="پایان بازه" className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"><Search size={15} /> اعمال فیلتر</button>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"><RotateCcw size={15} /> پاک کردن</button>
        </div>
      </form>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((x) => <Skeleton key={x} className="h-32" />)}</div><Skeleton className="h-80" /></div>
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="افراد دارای تردد" value={report.overview.uniqueUsers.toLocaleString("fa-IR")} hint={`${report.overview.attendanceDays.toLocaleString("fa-IR")} نفر-روز ثبت‌شده`} icon={UsersRound} />
            <StatCard label="مجموع حضور محاسبه‌شده" value={`${report.overview.totalHours.toLocaleString("fa-IR")} ساعت`} hint="بر اساس فاصله اولین تا آخرین تردد" icon={Clock3} />
            <StatCard label="میانگین حضور روزانه" value={`${report.overview.averageHoursPerAttendanceDay.toLocaleString("fa-IR")} ساعت`} hint="به ازای هر نفر-روز دارای تردد" icon={UserRoundCheck} />
            <StatCard label="موارد نیازمند بررسی" value={(report.overview.lateCount + report.overview.incompleteCount).toLocaleString("fa-IR")} hint={`${report.overview.incompleteCount.toLocaleString("fa-IR")} ثبت ناقص · ${report.overview.lateCount.toLocaleString("fa-IR")} ورود بعد از ${report.assumptions.lateAfter}`} icon={AlertTriangle} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="روند حضور در بازه انتخابی" subtitle="تغییر میانگین ساعات حضور و تعداد افراد دارای تردد در هر روز"><EChart option={trendOption} height={330} /></ChartCard>
            <ChartCard title="میانگین حضور دپارتمان‌ها" subtitle="میانگین ساعت حضور محاسبه‌شده برای هر نفر-روز"><EChart option={departmentOption} height={330} /></ChartCard>
          </div>

          <ChartCard title="موارد نیازمند بررسی به تفکیک دپارتمان" subtitle={`ورود دیرتر از ${report.assumptions.lateAfter}، خروج قبل از ${report.assumptions.earlyBefore} و ثبت‌های تک‌تردد`}><EChart option={alertsOption} height={320} /></ChartCard>

          <section className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-white/10 md:flex-row md:items-center md:justify-between md:p-5">
              <div><h2 className="font-bold text-gray-900 dark:text-white">جزئیات گزارش</h2><p className="mt-1 text-xs text-gray-500">برای بررسی جزئی‌تر بین ترددهای روزانه، اشخاص و دپارتمان‌ها جابه‌جا شوید.</p></div>
              <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-white/5">
                {([['records','روزانه',CalendarDays],['people','اشخاص',UserRoundCheck],['departments','دپارتمان‌ها',Building2]] as const).map(([key,label,Icon]) => <button key={key} onClick={() => setActiveTab(key)} className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition", activeTab === key ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white" : "text-gray-500")}><Icon size={14} />{label}</button>)}
              </div>
            </div>

            {activeTab === "records" && <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-right text-sm"><thead className="bg-gray-50/70 text-xs text-gray-500 dark:bg-white/[0.03]"><tr><th className="px-5 py-3">شخص / دپارتمان</th><th className="px-5 py-3">تاریخ</th><th className="px-5 py-3">اولین ورود</th><th className="px-5 py-3">آخرین خروج</th><th className="px-5 py-3">مدت حضور</th><th className="px-5 py-3">تردد</th><th className="px-5 py-3">وضعیت</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/5">{report.records.map((item) => <tr key={`${item.userId}-${item.date}`} className="transition hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"><td className="px-5 py-4"><div className="font-semibold text-gray-900 dark:text-white">{item.userName ?? "—"}</div><div className="mt-1 text-xs text-gray-400">{item.departmentName ?? "بدون دپارتمان"}</div></td><td className="px-5 py-4 text-gray-600 dark:text-gray-300">{formatDate(item.date)}</td><td className="px-5 py-4 font-medium">{formatTime(item.firstCheckIn)}</td><td className="px-5 py-4 font-medium">{formatTime(item.lastCheckOut)}</td><td className="px-5 py-4">{minutesToText(item.workedMinutes)}</td><td className="px-5 py-4">{item.totalEvents.toLocaleString("fa-IR")}</td><td className="px-5 py-4"><StatusBadge item={item} /></td><td className="px-5 py-4"><button title="جزئیات تردد" onClick={() => router.push(`/dashboard/attendance/${item.userId}?date=${item.date.slice(0,10)}`)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/5"><ChevronLeft size={17} /></button></td></tr>)}</tbody></table></div>}

            {activeTab === "people" && <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-gray-50/70 text-xs text-gray-500 dark:bg-white/[0.03]"><tr><th className="px-5 py-3">شخص</th><th className="px-5 py-3">دپارتمان</th><th className="px-5 py-3">روزهای ثبت‌شده</th><th className="px-5 py-3">مجموع حضور</th><th className="px-5 py-3">میانگین روزانه</th><th className="px-5 py-3">ورود دیرتر</th><th className="px-5 py-3">ثبت ناقص</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-white/5">{report.userStats.map((item) => <tr key={item.userId} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]"><td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{item.userName}</td><td className="px-5 py-4 text-gray-500">{item.departmentName}</td><td className="px-5 py-4">{item.days.toLocaleString("fa-IR")}</td><td className="px-5 py-4">{item.totalHours.toLocaleString("fa-IR")} ساعت</td><td className="px-5 py-4">{item.averageHoursPerDay.toLocaleString("fa-IR")} ساعت</td><td className="px-5 py-4">{item.late.toLocaleString("fa-IR")}</td><td className="px-5 py-4">{item.incomplete.toLocaleString("fa-IR")}</td></tr>)}</tbody></table></div>}

            {activeTab === "departments" && <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 md:p-5">{report.departmentStats.map((item) => <div key={item.departmentId ?? item.departmentName} className="rounded-2xl border border-gray-100 p-4 dark:border-white/10"><div className="flex items-center justify-between"><div><p className="font-bold text-gray-900 dark:text-white">{item.departmentName}</p><p className="mt-1 text-xs text-gray-400">{item.uniqueUsers.toLocaleString("fa-IR")} نفر دارای تردد</p></div><Building2 className="text-gray-300" size={20} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5"><span className="text-gray-400">میانگین حضور</span><p className="mt-1 font-bold text-gray-800 dark:text-white">{item.averageHoursPerDay.toLocaleString("fa-IR")} ساعت</p></div><div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5"><span className="text-gray-400">نفر-روز</span><p className="mt-1 font-bold text-gray-800 dark:text-white">{item.attendanceDays.toLocaleString("fa-IR")}</p></div></div></div>)}</div>}

            {!report.records.length && <div className="flex flex-col items-center justify-center px-5 py-16 text-center"><TimerReset className="mb-3 text-gray-300" size={36} /><p className="font-semibold text-gray-700 dark:text-gray-200">داده‌ای مطابق این فیلتر پیدا نشد</p><p className="mt-1 text-xs text-gray-400">بازه تاریخ، نام شخص یا دپارتمان را تغییر دهید.</p></div>}
          </section>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-xs leading-6 text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400">
            <strong className="text-gray-700 dark:text-gray-200">تعریف شاخص‌ها:</strong> {report.assumptions.workedTimeDefinition}. «ورود دیرتر» فعلاً نسبت به ساعت {report.assumptions.lateAfter} و «خروج زودتر» نسبت به {report.assumptions.earlyBefore} محاسبه می‌شود. این ساعات را می‌توان بعداً به تنظیمات شیفت سازمان متصل کرد.
          </div>
        </>
      ) : null}
    </div>
  );
}
