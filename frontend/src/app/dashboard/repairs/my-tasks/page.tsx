"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Search,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  User,
  Phone,
  Calendar,
  Hash,
  ClipboardList,
  ArrowRight,
  X,
} from "lucide-react";
import { repairsApi, type RepairCase, type RepairCaseDetail, type RepairStatus, type RepairType } from "@/lib/api/repairs";

// ─── Constants (همان مقادیر صفحه‌ی اصلی repairs) ──────────────
const STATUS_FA: Record<RepairStatus, string> = {
  REGISTERED: "ثبت شده",
  WAITING_REVIEW: "در انتظار بررسی",
  WAITING_COST_APPROVAL: "در انتظار تایید هزینه",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
  IN_REPAIR: "در حال تعمیر",
  QC: "کنترل کیفیت",
  READY_FOR_DELIVERY: "آماده تحویل",
  DELIVERED: "تحویل داده شده",
  CLOSED: "بسته شده",
  CANCELED: "لغو شده",
  NO_REPAIR_REQUIRED: "نیاز به تعمیر ندارد",
};

const STATUS_FLOW: Record<string, RepairStatus[]> = {
  REGISTERED: ["WAITING_REVIEW", "CANCELED"],
  WAITING_REVIEW: ["WAITING_COST_APPROVAL", "IN_REPAIR", "NO_REPAIR_REQUIRED"],
  WAITING_COST_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_REPAIR"],
  IN_REPAIR: ["QC"],
  QC: ["READY_FOR_DELIVERY", "IN_REPAIR"],
  READY_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  REGISTERED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  WAITING_REVIEW: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  WAITING_COST_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  IN_REPAIR: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  QC: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  READY_FOR_DELIVERY: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  DELIVERED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  CLOSED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  CANCELED: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  NO_REPAIR_REQUIRED: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

const TYPE_FA: Record<RepairType, string> = {
  IN_HOUSE: "درون‌سازمانی",
  ON_SITE: "در محل",
};

const ACTIVE_STATUSES: RepairStatus[] = [
  "WAITING_REVIEW",
  "APPROVED",
  "IN_REPAIR",
  "QC",
];

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  } catch { return d; }
}

// ─── Toast ────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; }
let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn("pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300", t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
          {t.type === "success" ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-500 dark:text-brand-400" />;
}

function InfoRow({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean; }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white/90" dir={ltr ? "ltr" : "rtl"}>{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────
function TaskCard({ repair, active, onClick }: { repair: RepairCase; active: boolean; onClick: () => void; }) {
  return (
    <button type="button" onClick={onClick} className={cn("group w-full rounded-2xl border p-4 text-right transition-all duration-150", active ? "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", active ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400")}>
            <Wrench size={14} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", active ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90")}>{repair.deviceTitle}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{repair.customer.fullName}</p>
          </div>
        </div>
        <ChevronRight size={14} className={cn("mt-1 shrink-0 text-gray-400 transition-transform", active && "rotate-90 text-brand-500")} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[repair.status])}>{STATUS_FA[repair.status]}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500" dir="ltr">#{repair.caseNumber}</span>
      </div>
    </button>
  );
}

// ─── Task Detail ──────────────────────────────────────────────
function TaskDetail({ repair: initialRepair, showToast, onRefresh }: { repair: RepairCase; showToast: (type: ToastType, message: string) => void; onRefresh: () => void; }) {
  const [detail, setDetail] = useState<RepairCaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "logs">("info");

  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | "">("");
  const [statusReason, setStatusReason] = useState("");

  const nextStatuses = STATUS_FLOW[initialRepair.status] ?? [];

  useEffect(() => {
    setLoadingDetail(true);
    setDetail(null);
    setSelectedStatus("");
    setStatusReason("");
    repairsApi.findOne(initialRepair.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [initialRepair.id]);

  const handleChangeStatus = async () => {
    if (!selectedStatus) return;
    setChangingStatus(true);
    try {
      await repairsApi.changeStatus(initialRepair.id, selectedStatus, statusReason || undefined);
      showToast("success", "وضعیت تعمیر تغییر یافت");
      onRefresh();
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? "خطا در تغییر وضعیت";
      showToast("error", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Wrench size={17} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{initialRepair.deviceTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">#{initialRepair.caseNumber}</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center rounded-xl px-3 py-1 text-xs font-medium", STATUS_COLORS[initialRepair.status])}>{STATUS_FA[initialRepair.status]}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {(["info", "logs"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn("relative px-6 py-3 text-sm font-medium transition-colors", activeTab === tab ? "text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300")}>
            {tab === "info" ? "اطلاعات" : "تاریخچه"}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 dark:bg-brand-400" />}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {activeTab === "info" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={<User size={15} className="text-blue-500" />} label="مشتری" value={initialRepair.customer.fullName} />
              <InfoRow icon={<Phone size={15} className="text-emerald-500" />} label="شماره تماس" value={initialRepair.customer.phoneNumber} ltr />
              <InfoRow icon={<Hash size={15} className="text-purple-500" />} label="نوع تعمیر" value={TYPE_FA[initialRepair.type]} />
              <InfoRow icon={<Calendar size={15} className="text-gray-500" />} label="تاریخ ثبت" value={formatDate(initialRepair.createdAt)} />
              {initialRepair.serialNumber && (
                <InfoRow icon={<Hash size={15} className="text-cyan-500" />} label="شماره سریال" value={initialRepair.serialNumber} ltr />
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">شرح مشکل</p>
              <p className="text-sm text-gray-800 dark:text-white/90">{initialRepair.problemDescription}</p>
            </div>

            {/* Change Status — تکنسین فقط همین را می‌تواند انجام دهد */}
            {nextStatuses.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">تغییر وضعیت</p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => (
                    <button key={s} type="button" onClick={() => setSelectedStatus(s === selectedStatus ? "" : s)} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors", selectedStatus === s ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400")}>
                      <ArrowRight size={11} />
                      {STATUS_FA[s]}
                    </button>
                  ))}
                </div>
                {selectedStatus && (
                  <div className="flex gap-2 pt-1">
                    <input type="text" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="دلیل / توضیح (اختیاری)" className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500" />
                    <button type="button" onClick={handleChangeStatus} disabled={changingStatus} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                      {changingStatus ? <Spinner size={13} /> : <Check size={13} />}
                      ثبت
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                <ClipboardList size={15} className="shrink-0 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">این پرونده در وضعیت نهایی قرار دارد و قابل تغییر نیست</p>
              </div>
            )}
          </>
        )}

        {activeTab === "logs" && (
          <div className="space-y-2">
            {loadingDetail ? (
              <div className="flex justify-center py-8"><Spinner size={20} /></div>
            ) : !detail || detail.statusLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">تاریخچه‌ای وجود ندارد</p>
            ) : (
              [...detail.statusLogs].reverse().map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                  <ClipboardList size={14} className="mt-0.5 shrink-0 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {log.oldStatus && (
                        <>
                          <span className={cn("rounded-lg px-1.5 py-0.5 text-[11px] font-medium", STATUS_COLORS[log.oldStatus])}>{STATUS_FA[log.oldStatus]}</span>
                          <ArrowRight size={11} className="text-gray-400" />
                        </>
                      )}
                      <span className={cn("rounded-lg px-1.5 py-0.5 text-[11px] font-medium", STATUS_COLORS[log.newStatus])}>{STATUS_FA[log.newStatus]}</span>
                    </div>
                    {log.reason && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{log.reason}</p>}
                    <p className="mt-1 text-[10px] text-gray-400">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MyTasksPage() {
  const { toasts, show: showToast } = useToast();

  const [tasks, setTasks] = useState<RepairCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId) ?? null, [tasks, activeId]);

  const [search, setSearch] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filterActiveOnly) {
      list = list.filter((t) => ACTIVE_STATUSES.includes(t.status) || t.status === "REGISTERED");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.deviceTitle.toLowerCase().includes(q) || t.customer.fullName.toLowerCase().includes(q) || t.caseNumber.includes(q));
    }
    return list;
  }, [tasks, search, filterActiveOnly]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // بک‌اند خودش بر اساس scope کاربر (SELF برای تکنسین) فیلتر می‌کند
      const { data } = await repairsApi.findAll();
      setTasks(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch {
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { fetchData(); }, []);

  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastContainer toasts={toasts} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">درخواست‌های تعمیر من</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">پرونده‌هایی که به شما ارجاع داده شده را پیگیری و مرحله‌بندی کنید</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در درخواست‌ها..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={() => setFilterActiveOnly((v) => !v)}
            className={cn(
              "flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors",
              filterActiveOnly
                ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            )}
          >
            <span>فقط درخواست‌های فعال</span>
            {filterActiveOnly ? <Check size={13} /> : <X size={13} />}
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size={22} /></div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"><AlertCircle size={15} />{error}</div>
              <button onClick={fetchData} className="mt-2 text-xs text-red-600 underline dark:text-red-400">تلاش مجدد</button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Wrench size={24} className="text-gray-400" /></div>
              <p className="text-sm font-medium text-gray-700 dark:text-white/80">فعلاً درخواستی برای شما ثبت نشده</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">موردی پیدا نشد</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((t) => (
                <TaskCard key={t.id} repair={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />
              ))}
            </div>
          )}
        </aside>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeTask ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Wrench size={22} className="text-gray-400" /></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">یک درخواست را از ستون چپ انتخاب کنید</p>
            </div>
          ) : (
            <TaskDetail key={activeTask.id} repair={activeTask} showToast={showToast} onRefresh={fetchData} />
          )}
        </div>
      </div>
    </div>
  );
}