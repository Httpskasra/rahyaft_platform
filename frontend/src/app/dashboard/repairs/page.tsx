"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Wrench,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  User,
  Phone,
  Hash,
  Calendar,
  ClipboardList,
  ArrowRight,
  UserPlus,
  Building2,
} from "lucide-react";
import { repairsApi, type RepairCase, type RepairCaseDetail, type RepairStatus, type RepairType } from "@/lib/api/repairs";
import { usersApi, type UserData } from "@/lib/api/users";
import { CustomerPickerModal } from "@/components/repairs/CustomerPickerModal";
import type { Customer } from "@/lib/api/customers";
// ─── Constants ────────────────────────────────────────────────
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

// ─── Utility ──────────────────────────────────────────────────
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

// ─── Modal ────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-md" }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; maxWidth?: string; }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900", maxWidth)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-500 dark:text-brand-400" />;
}

// ─── Form Controls ────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, ltr, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; ltr?: boolean; required?: boolean; }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{required && <span className="text-red-500 mr-0.5">*</span>}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={ltr ? "ltr" : "rtl"} className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean; }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{required && <span className="text-red-500 mr-0.5">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
        <option value="">-- انتخاب کنید --</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────────
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

// ─── Repair Card ──────────────────────────────────────────────
function RepairCard({ repair, active, onClick }: { repair: RepairCase; active: boolean; onClick: () => void; }) {
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

// ─── Repair Detail ────────────────────────────────────────────
function RepairDetail({ repair: initialRepair, technicians, showToast, onRefresh }: { repair: RepairCase; technicians: UserData[]; showToast: (type: ToastType, message: string) => void; onRefresh: () => void; }) {
  const [detail, setDetail] = useState<RepairCaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "logs">("info");

  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | "">("");
  const [statusReason, setStatusReason] = useState("");

  const [assigningTech, setAssigningTech] = useState(false);
  const [selectedTech, setSelectedTech] = useState(initialRepair.technicianId ?? "");

  const nextStatuses = STATUS_FLOW[initialRepair.status] ?? [];

  useEffect(() => {
    setLoadingDetail(true);
    setDetail(null);
    setSelectedTech(initialRepair.technicianId ?? "");
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
    } catch {
      showToast("error", "خطا در تغییر وضعیت");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAssignTech = async () => {
    if (!selectedTech) return;
    setAssigningTech(true);
    try {
      await repairsApi.assignTechnician(initialRepair.id, selectedTech);
      showToast("success", "تکنسین تخصیص داده شد");
      onRefresh();
    } catch {
      showToast("error", "خطا در تخصیص تکنسین");
    } finally {
      setAssigningTech(false);
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
              {initialRepair.technician && (
                <InfoRow icon={<User size={15} className="text-amber-500" />} label="تکنسین" value={initialRepair.technician.name} />
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">شرح مشکل</p>
              <p className="text-sm text-gray-800 dark:text-white/90">{initialRepair.problemDescription}</p>
            </div>

            {/* Assign Technician */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">تخصیص تکنسین</p>
              <div className="flex gap-2">
                <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="h-10 flex-1 appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
                  <option value="">-- انتخاب تکنسین --</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="button" onClick={handleAssignTech} disabled={!selectedTech || assigningTech} className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors", selectedTech && !assigningTech ? "bg-brand-500 text-white hover:bg-brand-600" : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600")}>
                  {assigningTech ? <Spinner size={13} /> : <Check size={13} />}
                  تخصیص
                </button>
              </div>
            </div>

            {/* Change Status */}
            {nextStatuses.length > 0 && (
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
                    <input type="text" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="دلیل (اختیاری)" className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500" />
                    <button type="button" onClick={handleChangeStatus} disabled={changingStatus} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                      {changingStatus ? <Spinner size={13} /> : <Check size={13} />}
                      ثبت
                    </button>
                  </div>
                )}
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
                    <div className="flex items-center gap-2 flex-wrap">
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

// ─── Create Repair Modal ──────────────────────────────────────
// ─── Create Repair Modal ──────────────────────────────────────
function CreateRepairModal({ open, onClose, onCreate, showToast }: { open: boolean; onClose: () => void; onCreate: () => void; showToast: (type: ToastType, message: string) => void; }) {
  const [form, setForm] = useState({ deviceTitle: "", serialNumber: "", problemDescription: "", type: "" as RepairType | "" });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ deviceTitle: "", serialNumber: "", problemDescription: "", type: "" });
    setSelectedCustomer(null);
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !form.deviceTitle || !form.problemDescription || !form.type) {
      showToast("error", "لطفاً تمام فیلدهای الزامی را پر کنید");
      return;
    }
    setCreating(true);
    try {
      await repairsApi.create({
        customerId: selectedCustomer.id,
        deviceTitle: form.deviceTitle,
        serialNumber: form.serialNumber || undefined,
        problemDescription: form.problemDescription,
        type: form.type,
      });
      showToast("success", "پرونده تعمیر ایجاد شد");
      onCreate();
      onClose();
    } catch {
      showToast("error", "خطا در ایجاد پرونده تعمیر");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="پرونده تعمیر جدید" subtitle="اطلاعات دستگاه و مشکل را وارد کنید">
        <div className="space-y-4">
          {/* Customer selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              مشتری<span className="mr-0.5 text-red-500">*</span>
            </label>

            {selectedCustomer ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-800 dark:bg-brand-500/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
                  <User size={15} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">{selectedCustomer.fullName}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span dir="ltr" className="flex items-center gap-1"><Phone size={11} />{selectedCustomer.phoneNumber}</span>
                    {selectedCustomer.companyName && (
                      <span className="flex items-center gap-1 truncate"><Building2 size={11} />{selectedCustomer.companyName}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                  تغییر
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-sm font-medium text-gray-500 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors"
              >
                <UserPlus size={14} />
                انتخاب یا ساخت مشتری
              </button>
            )}
          </div>

          <InputField label="عنوان دستگاه" value={form.deviceTitle} onChange={(v) => setForm(f => ({ ...f, deviceTitle: v }))} placeholder="مثلاً: لپ‌تاپ Dell XPS 15" required />
          <InputField label="شماره سریال" value={form.serialNumber} onChange={(v) => setForm(f => ({ ...f, serialNumber: v }))} placeholder="اختیاری" ltr />
          <SelectField label="نوع تعمیر" value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v as RepairType }))} options={[{ value: "IN_HOUSE", label: "درون‌سازمانی" }, { value: "ON_SITE", label: "در محل" }]} required />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">شرح مشکل<span className="text-red-500 mr-0.5">*</span></label>
            <textarea value={form.problemDescription} onChange={(e) => setForm(f => ({ ...f, problemDescription: e.target.value }))} rows={3} placeholder="مشکل دستگاه را شرح دهید..." className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">انصراف</button>
            <button onClick={handleSubmit} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {creating ? <Spinner size={13} /> : <Plus size={14} />}
              ایجاد پرونده
            </button>
          </div>
        </div>
      </Modal>

      <CustomerPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => setSelectedCustomer(c)}
      />
    </>
  );
}
// ─── Main Page ────────────────────────────────────────────────
export default function RepairsPage() {
  const { toasts, show: showToast } = useToast();

  const [repairs, setRepairs] = useState<RepairCase[]>([]);
  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRepair = useMemo(() => repairs.find(r => r.id === activeId) ?? null, [repairs, activeId]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return repairs;
    return repairs.filter(r => r.deviceTitle.toLowerCase().includes(q) || r.customer.fullName.toLowerCase().includes(q) || r.caseNumber.includes(q));
  }, [repairs, search]);

  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repairsRes, usersRes] = await Promise.all([repairsApi.findAll(), usersApi.findAll()]);
      setRepairs(repairsRes.data);
      setTechnicians(usersRes.data);
      if (repairsRes.data.length > 0 && !activeId) setActiveId(repairsRes.data[0].id);
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

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">مدیریت تعمیرات</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">پرونده‌های تعمیر را مشاهده، ثبت و پیگیری کنید</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
          <Plus size={15} />
          پرونده جدید
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در پرونده‌ها..." className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500" />
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size={22} /></div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"><AlertCircle size={15} />{error}</div>
              <button onClick={fetchData} className="mt-2 text-xs text-red-600 underline dark:text-red-400">تلاش مجدد</button>
            </div>
          ) : repairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Wrench size={24} className="text-gray-400" /></div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">هنوز پرونده‌ای ثبت نشده</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">اولین پرونده تعمیر را ثبت کنید</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"><Plus size={14} />پرونده جدید</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">پرونده‌ای پیدا نشد</p>
              ) : filtered.map(r => (
                <RepairCard key={r.id} repair={r} active={r.id === activeId} onClick={() => setActiveId(r.id)} />
              ))}
            </div>
          )}
        </aside>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeRepair ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Wrench size={22} className="text-gray-400" /></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">یک پرونده را از ستون چپ انتخاب کنید</p>
            </div>
          ) : (
            <RepairDetail key={activeRepair.id} repair={activeRepair} technicians={technicians} showToast={showToast} onRefresh={fetchData} />
          )}
        </div>
      </div>

      <CreateRepairModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={fetchData} showToast={showToast} />
    </div>
  );
}