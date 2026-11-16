/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Building2, Plus, Search, UserRound } from "lucide-react";
import { customersApi, type Customer, type CustomerType } from "@/lib/api/customers";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { CustomerModal } from "./components";
import { nameOf, statusFa, typeFa } from "./constants";

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<CustomerType | "">("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const requestIdRef = useRef(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const toast = (kind: "ok" | "err", text: string) => { setMessage({ type: kind, text }); setTimeout(() => setMessage(null), 3000); };

  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  const load = useCallback(async (nextPage = 1, append = false) => {
    const requestId = append ? requestIdRef.current : ++requestIdRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try { const response = await customersApi.findAll({ search: debouncedSearch || undefined, type: type || undefined, page: nextPage, pageSize: 20 }); if (requestId !== requestIdRef.current) return; setItems((current) => append ? [...current, ...response.data.items.filter((item) => !current.some((existing) => existing.id === item.id))] : response.data.items); setPage(nextPage); setMeta({ total: response.data.meta.total, totalPages: response.data.meta.totalPages || 1 }); }
    catch { setError("دریافت فهرست مشتریان ناموفق بود"); }
    finally { if (requestId === requestIdRef.current) { setLoading(false); setLoadingMore(false); } }
  }, [debouncedSearch, type]);
  useEffect(() => { setPage(1); void load(1, false); }, [load]);
  const loadMore = useCallback(() => load(page + 1, true), [load, page]);

  return <div dir="rtl" lang="fa" className="space-y-5">
    {message && <div className={`fixed bottom-6 left-6 z-[100] rounded-xl px-4 py-3 text-sm text-white shadow-xl ${message.type === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>{message.text}</div>}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-xl font-bold text-gray-900 dark:text-white">CRM و مدیریت مشتریان</h1><p className="mt-1 text-sm text-gray-500">فهرست مشتریان؛ برای مشاهده نمای ۳۶۰ درجه، یک ردیف را باز کنید.</p></div><button onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"><Plus size={17} /> مشتری جدید</button></div>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative w-full max-w-lg"><Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="نام، موبایل، کد ملی یا سازمان..." className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900" /></div><select value={type} onChange={(e) => { setType(e.target.value as CustomerType | ""); setPage(1); }} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="">همه مشتریان</option><option value="PERSON">اشخاص حقیقی</option><option value="ORGANIZATION">سازمان‌ها و کلینیک‌ها</option></select></div>
    {loading ? <div className="flex justify-center py-20"><Spinner /></div> : error && items.length === 0 ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div><button onClick={() => void load(1, false)} className="mt-3 underline">تلاش مجدد</button></div> : <DataTable rows={items} hasMore={page < meta.totalPages} loadMore={loadMore} isLoadingMore={loadingMore} totalRows={meta.total} getRowKey={(customer) => customer.id} getRowHref={(customer) => `/dashboard/customers/${customer.id}`} emptyMessage="مشتری‌ای پیدا نشد" columns={[
      { key: "name", header: "مشتری", cell: (customer) => <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{customer.type === "ORGANIZATION" ? <Building2 size={17} /> : <UserRound size={17} />}</span><div><p className="font-semibold text-gray-900 dark:text-white">{nameOf(customer)}</p><p className="mt-1 text-xs text-gray-500" dir="ltr">{customer.mobile || customer.phone || "بدون شماره تماس"}</p></div></div> },
      { key: "type", header: "نوع", cell: (customer) => typeFa[customer.type] },
      { key: "status", header: "وضعیت", cell: (customer) => <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">{statusFa[customer.status]}</span> },
      { key: "city", header: "شهر", cell: (customer) => customer.city || "—" },
      { key: "repairs", header: "تعمیرات", cell: (customer) => `${(customer._count?.repairs ?? 0).toLocaleString("fa-IR")} پرونده` },
      { key: "registered", header: "تاریخ ثبت", cell: (customer) => new Intl.DateTimeFormat("fa-IR").format(new Date(customer.registeredAt)) },
    ]} />}
    <CustomerModal open={createOpen} customer={null} close={() => setCreateOpen(false)} done={() => { setCreateOpen(false); toast("ok", "مشتری ایجاد شد"); void load(1, false); }} />
  </div>;
}
