/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart3, ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { repairsApi, getRepairCustomerName, type RepairCase, type RepairStatus, type RepairType } from "@/lib/api/repairs";
import { Spinner } from "@/components/ui/Spinner";
import { DataTable } from "@/components/ui/DataTable";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import { CreateRepairModal } from "@/features/repairs/components";
import { STATUS_COLORS, STATUS_FA, TYPE_FA, formatDate } from "./components/repairConfig";

export default function RepairsPage() {
  const { toasts, show: showToast } = useToast();
  const [repairs, setRepairs] = useState<RepairCase[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<RepairStatus | "">("");
  const [type, setType] = useState<RepairType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await repairsApi.findAll({ page, limit: 20, search: debouncedSearch || undefined, status: status || undefined, type: type || undefined, from: from || undefined, to: to || undefined });
      setRepairs(response.data.items); setMeta(response.data.meta);
    } catch { setError("خطا در دریافت پرونده‌های تعمیر"); }
    finally { setLoading(false); }
  }, [debouncedSearch, from, page, status, to, type]);
  useEffect(() => { void load(); }, [load]);
  const hasFilters = Boolean(search || status || type || from || to);
  const clearFilters = () => { setSearch(""); setDebouncedSearch(""); setStatus(""); setType(""); setFrom(""); setTo(""); setPage(1); };

  return <div dir="rtl" lang="fa" className="min-h-screen">
    <ToastViewport toasts={toasts} />
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">مدیریت تعمیرات</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">فهرست پرونده‌ها؛ برای پیگیری کامل، یک ردیف را باز کنید.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/dashboard/repairs/reports" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><BarChart3 size={16} /> تحلیل کلی</Link><button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"><Plus size={16} /> پرونده جدید</button></div>
    </div>

    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200"><SlidersHorizontal size={16} /> جستجو و فیلتر</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="مشتری، شماره پرونده، دستگاه یا سریال..." className="h-10 w-full rounded-xl border border-gray-200 pr-9 pl-3 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900" /></div>
        <select aria-label="وضعیت" value={status} onChange={(e) => { setStatus(e.target.value as RepairStatus | ""); setPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="">همه وضعیت‌ها</option>{Object.entries(STATUS_FA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="نوع تعمیر" value={type} onChange={(e) => { setType(e.target.value as RepairType | ""); setPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="">همه انواع تعمیر</option>{Object.entries(TYPE_FA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <div className="flex gap-2"><input aria-label="از تاریخ" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 px-2 text-xs dark:border-gray-700 dark:bg-gray-900" /><input aria-label="تا تاریخ" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 px-2 text-xs dark:border-gray-700 dark:bg-gray-900" /></div>
      </div>
      {hasFilters && <button onClick={clearFilters} className="mt-3 text-xs font-medium text-brand-600 dark:text-brand-400">پاک کردن فیلترها</button>}
    </div>

    {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
    : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div><button onClick={load} className="mt-3 underline">تلاش مجدد</button></div>
    : <DataTable rows={repairs} getRowKey={(repair) => repair.id} getRowHref={(repair) => `/dashboard/repairs/${repair.id}`} emptyMessage={hasFilters ? "پرونده‌ای با این فیلترها پیدا نشد" : "هنوز پرونده تعمیری ثبت نشده است"} columns={[
      { key: "case", header: "شماره پرونده", cell: (repair) => <span className="font-semibold text-brand-600 dark:text-brand-400" dir="ltr">#{repair.caseNumber}</span> },
      { key: "device", header: "دستگاه", cell: (repair) => <div><p className="font-semibold text-gray-900 dark:text-white">{repair.deviceTitle}</p><p className="mt-1 text-xs text-gray-500" dir="ltr">{repair.serialNumber || "بدون سریال"}</p></div> },
      { key: "customer", header: "مشتری", cell: (repair) => getRepairCustomerName(repair.customer) },
      { key: "type", header: "نوع", cell: (repair) => TYPE_FA[repair.type] },
      { key: "status", header: "وضعیت", cell: (repair) => <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[repair.status]}`}>{STATUS_FA[repair.status]}</span> },
      { key: "technician", header: "تکنسین", cell: (repair) => repair.technician?.name ?? "تخصیص‌نیافته" },
      { key: "created", header: "تاریخ ثبت", cell: (repair) => formatDate(repair.createdAt) },
    ]} />}
    {!loading && !error && meta.totalPages > 1 && <div className="mt-4 flex items-center justify-between text-xs text-gray-500"><span>{meta.total.toLocaleString("fa-IR")} پرونده · صفحه {page.toLocaleString("fa-IR")} از {meta.totalPages.toLocaleString("fa-IR")}</span><div className="flex gap-1"><button aria-label="صفحه قبل" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={16} /></button><button aria-label="صفحه بعد" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={16} /></button></div></div>}
    <CreateRepairModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={load} showToast={showToast} />
  </div>;
}
