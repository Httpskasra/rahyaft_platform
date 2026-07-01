"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  IdCard,
  Calendar,
  Hash,
  Mail,
  Home,
  UserPlus,
  Wrench,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import {
  customersApi,
  type Customer,
  type Gender,
  type OccupationGroup,
} from "@/lib/api/customers";

// ─── Labels ───────────────────────────────────────────────────
const OCCUPATION_GROUP_FA: Record<OccupationGroup, string> = {
  HAIR_TRANSPLANT_TECHNICIAN: "تکنسین کاشت مو",
  NAIL_TECHNICIAN: "تکنسین کاشت ناخن",
  GENERAL_PRACTITIONER: "پزشک عمومی",
  PHYSICIAN: "پزشک",
  HAIR_BEAUTY_CLINIC: "کلینیک کاشت مو و زیبایی",
  HOME_DEVICE_CUSTOMER: "مشتری حضوری دستگاه خانگی",
  BARBER: "آرایشگر",
  DENTIST: "دندانپزشک",
  VETERINARIAN: "دامپزشک",
  COLLEAGUE: "همکار",
  EMPLOYEE: "کارمند",
  DERMATOLOGIST: "متخصص پوست و مو",
  GYNECOLOGIST: "متخصص زنان",
  OTHER: "سایر",
};

const GENDER_FA: Record<Gender, string> = {
  MALE: "مرد",
  FEMALE: "زن",
};

// ─── Extended Customer type (from backend findOne) ─────────────
interface RepairSummary {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  deviceTitle: string;
  createdAt: string;
}

// ─── Local detail type (alias of API type, with optional repairs) ──
interface CustomerDetail extends Customer {
  repairs?: RepairSummary[];
}

// ─── Utility ──────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(dateString?: string) {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

// ─── Toast ────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}
let _toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((type: ToastType, message: string) => {
    const id = ++_toastId;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur",
            "animate-in fade-in slide-in-from-bottom-3 duration-300",
            t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          )}
        >
          {t.type === "success" ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-500 dark:text-brand-400" />;
}

// ─── InputField ───────────────────────────────────────────────
function InputField({
  label,
  value,
  onChange,
  placeholder,
  ltr,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="mr-0.5 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : "rtl"}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="mr-0.5 text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p
          className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white/90"
          dir={ltr ? "ltr" : "rtl"}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ─── CustomerCard (sidebar list item) ─────────────────────────
function CustomerCard({
  customer,
  active,
  onClick,
}: {
  customer: CustomerDetail;
  active: boolean;
  onClick: () => void;
}) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active
          ? "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
              active
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold",
                active ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90"
              )}
            >
              {fullName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
              {customer.mobile}
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500"
          )}
        />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {customer.city}
        </span>
        <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {OCCUPATION_GROUP_FA[customer.occupationGroup as OccupationGroup] ?? customer.occupationGroup}
        </span>
        {(customer._count?.repairs ?? 0) > 0 && (
          <span className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {customer._count!.repairs} پرونده
          </span>
        )}
      </div>
    </button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Users size={28} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">هنوز مشتری‌ای ثبت نشده</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">اولین مشتری را اضافه کنید</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        <Plus size={14} />
        افزودن مشتری
      </button>
    </div>
  );
}

function NoSelection() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <User size={24} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">یک مشتری را انتخاب کنید</p>
    </div>
  );
}

// ─── REPAIR STATUS badges ─────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
  DONE:        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
  CANCELLED:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
};
const STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار", IN_PROGRESS: "در حال انجام", DONE: "تکمیل‌شده", CANCELLED: "لغو‌شده",
};

// ─── CustomerDetail Panel ─────────────────────────────────────
function CustomerDetailPanel({
  customer,
  onRefresh,
  showToast,
}: {
  customer: CustomerDetail;
  onRefresh: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "contact" | "repairs">("info");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = () => ({
    firstName: customer.firstName,
    lastName: customer.lastName,
    mobile: customer.mobile,
    phone: customer.phone,
    nationalCode: customer.nationalCode,
    birthDate: customer.birthDate,
    gender: customer.gender as string,
    province: customer.province,
    city: customer.city,
    address: customer.address,
    occupation: customer.occupation,
    occupationGroup: customer.occupationGroup as string,
    email: customer.email ?? "",
    postalCode: customer.postalCode ?? "",
  });

  const [form, setForm] = useState(emptyForm);

  const fullName = `${customer.firstName} ${customer.lastName}`;

  const handleEdit = () => {
    setForm(emptyForm());
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.mobile.trim()) {
      showToast("error", "نام، نام خانوادگی و موبایل الزامی هستند");
      return;
    }
    setSaving(true);
    try {
      await customersApi.update(customer.id, {
        ...form,
        email: form.email || undefined,
        postalCode: form.postalCode || undefined,
      } as any);
      showToast("success", "اطلاعات مشتری بروزرسانی شد");
      setEditing(false);
      onRefresh();
    } catch {
      showToast("error", "خطا در بروزرسانی مشتری");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
            <User size={17} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{fullName}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{customer.mobile}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil size={12} />
            ویرایش
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {(["info", "contact", "repairs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-brand-600 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            {tab === "info" ? "اطلاعات شخصی" : tab === "contact" ? "آدرس و تماس" : "پرونده‌های تعمیر"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* ── Info Tab ── */}
        {activeTab === "info" && !editing && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={<User size={15} className="text-blue-500" />} label="نام" value={customer.firstName} />
            <InfoRow icon={<User size={15} className="text-blue-500" />} label="نام خانوادگی" value={customer.lastName} />
            <InfoRow icon={<IdCard size={15} className="text-purple-500" />} label="کد ملی" value={customer.nationalCode} ltr />
            <InfoRow
              icon={<Calendar size={15} className="text-amber-500" />}
              label="تاریخ تولد"
              value={customer.birthDate}
            />
            <InfoRow
              icon={<User size={15} className="text-pink-500" />}
              label="جنسیت"
              value={GENDER_FA[customer.gender as Gender] ?? customer.gender}
            />
            <InfoRow
              icon={<Briefcase size={15} className="text-emerald-500" />}
              label="شغل"
              value={customer.occupation}
            />
            <InfoRow
              icon={<Briefcase size={15} className="text-teal-500" />}
              label="گروه شغلی"
              value={OCCUPATION_GROUP_FA[customer.occupationGroup as OccupationGroup] ?? customer.occupationGroup}
            />
            <InfoRow
              icon={<Calendar size={15} className="text-gray-500" />}
              label="تاریخ ثبت"
              value={formatDate(customer.registeredAt)}
            />
          </div>
        )}

        {/* ── Contact Tab ── */}
        {activeTab === "contact" && !editing && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={<Phone size={15} className="text-emerald-500" />} label="موبایل" value={customer.mobile} ltr />
            <InfoRow icon={<Phone size={15} className="text-blue-500" />} label="تلفن ثابت" value={customer.phone} ltr />
            <InfoRow icon={<Mail size={15} className="text-red-500" />} label="ایمیل" value={customer.email} ltr />
            <InfoRow icon={<MapPin size={15} className="text-amber-500" />} label="استان" value={customer.province} />
            <InfoRow icon={<MapPin size={15} className="text-orange-500" />} label="شهر" value={customer.city} />
            <InfoRow icon={<Hash size={15} className="text-gray-500" />} label="کد پستی" value={customer.postalCode} ltr />
            <div className="sm:col-span-2">
              <InfoRow icon={<Home size={15} className="text-indigo-500" />} label="آدرس" value={customer.address} />
            </div>
          </div>
        )}

        {/* ── Repairs Tab ── */}
        {activeTab === "repairs" && !editing && (
          <div className="space-y-3">
            {!customer.repairs || customer.repairs.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
                <Wrench size={16} className="shrink-0 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">هیچ پرونده تعمیری ثبت نشده</p>
              </div>
            ) : (
              customer.repairs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-800/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
                      <Wrench size={14} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {r.deviceTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                        {r.caseNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_COLORS[r.status] ?? STATUS_COLORS.PENDING
                      )}
                    >
                      {STATUS_FA[r.status] ?? r.status}
                    </span>
                    <p className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Edit Form (shared across tabs) ── */}
        {editing && (
          <div className="space-y-4">
            <div className="mb-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 dark:border-brand-900 dark:bg-brand-500/10">
              <p className="text-xs text-brand-700 dark:text-brand-400">در حال ویرایش اطلاعات مشتری</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="نام" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} placeholder="نام" required />
              <InputField label="نام خانوادگی" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} placeholder="نام خانوادگی" required />
              <InputField label="موبایل" value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} placeholder="09xxxxxxxxx" ltr required />
              <InputField label="تلفن ثابت" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="02112345678" ltr />
              <InputField label="کد ملی" value={form.nationalCode} onChange={(v) => setForm((f) => ({ ...f, nationalCode: v }))} placeholder="۱۰ رقم" ltr required />
              <InputField label="تاریخ تولد" value={form.birthDate} onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))} placeholder="1370/01/01" ltr />
              <SelectField
                label="جنسیت"
                value={form.gender}
                onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                options={[{ value: "MALE", label: "مرد" }, { value: "FEMALE", label: "زن" }]}
                required
              />
              <InputField label="شغل" value={form.occupation} onChange={(v) => setForm((f) => ({ ...f, occupation: v }))} placeholder="عنوان شغل" />
            </div>

            <SelectField
              label="گروه شغلی"
              value={form.occupationGroup}
              onChange={(v) => setForm((f) => ({ ...f, occupationGroup: v }))}
              options={Object.entries(OCCUPATION_GROUP_FA).map(([value, label]) => ({ value, label }))}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="استان" value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v }))} placeholder="استان" />
              <InputField label="شهر" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="شهر" />
              <InputField label="کد پستی" value={form.postalCode} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} placeholder="۱۰ رقم" ltr />
              <InputField label="ایمیل" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="example@email.com" ltr type="email" />
            </div>

            <InputField label="آدرس" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="آدرس کامل" />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                انصراف
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
              >
                {saving ? <Spinner size={13} /> : <Check size={14} />}
                ذخیره
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CreateCustomerModal ──────────────────────────────────────
function CreateCustomerModal({
  open,
  onClose,
  onCreate,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const emptyForm = {
    firstName: "", lastName: "", mobile: "", phone: "",
    nationalCode: "", birthDate: "", gender: "MALE",
    province: "", city: "", address: "",
    occupation: "", occupationGroup: "OTHER",
    email: "", postalCode: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.mobile.trim() || !form.nationalCode.trim()) {
      showToast("error", "فیلدهای اجباری را تکمیل کنید");
      return;
    }
    setCreating(true);
    try {
      await customersApi.create({
        ...form,
        email: form.email || undefined,
        postalCode: form.postalCode || undefined,
      } as any);
      showToast("success", "مشتری جدید با موفقیت ثبت شد");
      setForm(emptyForm);
      onCreate();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "خطا در ثبت مشتری";
      showToast("error", msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="افزودن مشتری جدید" subtitle="اطلاعات مشتری را وارد کنید" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">اطلاعات شخصی</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="نام" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} placeholder="نام" required />
          <InputField label="نام خانوادگی" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} placeholder="نام خانوادگی" required />
          <InputField label="کد ملی" value={form.nationalCode} onChange={(v) => setForm((f) => ({ ...f, nationalCode: v }))} placeholder="۱۰ رقم" ltr required />
          <InputField label="تاریخ تولد" value={form.birthDate} onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))} placeholder="1370/01/01" ltr required />
          <SelectField
            label="جنسیت"
            value={form.gender}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            options={[{ value: "MALE", label: "مرد" }, { value: "FEMALE", label: "زن" }]}
            required
          />
        </div>

        <div className="mt-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">اطلاعات تماس</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="موبایل" value={form.mobile} onChange={(v) => setForm((f) => ({ ...f, mobile: v }))} placeholder="09xxxxxxxxx" ltr required />
            <InputField label="تلفن ثابت" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="02112345678" ltr required />
            <InputField label="ایمیل" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="example@email.com" ltr type="email" />
          </div>
        </div>

        <div className="mt-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">موقعیت جغرافیایی</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="استان" value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v }))} placeholder="مثلاً: تهران" required />
            <InputField label="شهر" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="مثلاً: تهران" required />
            <InputField label="کد پستی" value={form.postalCode} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} placeholder="۱۰ رقم" ltr />
          </div>
          <div className="mt-4">
            <InputField label="آدرس" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="آدرس کامل" required />
          </div>
        </div>

        <div className="mt-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">اطلاعات شغلی</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="شغل" value={form.occupation} onChange={(v) => setForm((f) => ({ ...f, occupation: v }))} placeholder="عنوان شغل" required />
            <SelectField
              label="گروه شغلی"
              value={form.occupationGroup}
              onChange={(v) => setForm((f) => ({ ...f, occupationGroup: v }))}
              options={Object.entries(OCCUPATION_GROUP_FA).map(([value, label]) => ({ value, label }))}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            انصراف
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreate}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
              !creating ? "bg-brand-500 hover:bg-brand-600" : "cursor-not-allowed bg-brand-300 dark:bg-brand-800"
            )}
          >
            {creating && <Spinner size={13} />}
            <UserPlus size={14} />
            ثبت مشتری
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── DeleteCustomerModal ──────────────────────────────────────
function DeleteCustomerModal({
  open,
  onClose,
  customer,
  onDelete,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  customer: CustomerDetail | null;
  onDelete: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      await customersApi.remove(customer.id);
      showToast("success", `مشتری «${customer.firstName} ${customer.lastName}» حذف شد`);
      onDelete();
      onClose();
    } catch {
      showToast("error", "خطا در حذف مشتری");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="حذف مشتری" subtitle="این عمل برگشت‌پذیر نیست">
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">
              آیا مطمئن هستید که می‌خواهید مشتری{" "}
              <strong>«{customer?.firstName} {customer?.lastName}»</strong> را حذف کنید؟{" "}
              تمام اطلاعات مرتبط با این مشتری از بین خواهد رفت.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            انصراف
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {deleting ? <Spinner size={13} /> : <Trash2 size={14} />}
            حذف مشتری
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Advanced Search Panel ────────────────────────────────────
function AdvancedSearch({
  open,
  onSearch,
}: {
  open: boolean;
  onSearch: (params: Record<string, string>) => void;
}) {
  const [fields, setFields] = useState({
    firstName: "", lastName: "", nationalCode: "",
    mobile: "", province: "", city: "",
    occupationGroup: "", gender: "",
  });

  const set = (k: keyof typeof fields) => (v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  if (!open) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">جستجوی پیشرفته</p>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="نام" value={fields.firstName} onChange={set("firstName")} placeholder="نام" />
        <InputField label="نام خانوادگی" value={fields.lastName} onChange={set("lastName")} placeholder="نام خانوادگی" />
        <InputField label="کد ملی" value={fields.nationalCode} onChange={set("nationalCode")} placeholder="۱۰ رقم" ltr />
        <InputField label="موبایل" value={fields.mobile} onChange={set("mobile")} placeholder="09xxxxxxxx" ltr />
        <InputField label="استان" value={fields.province} onChange={set("province")} placeholder="استان" />
        <InputField label="شهر" value={fields.city} onChange={set("city")} placeholder="شهر" />
        <SelectField
          label="گروه شغلی"
          value={fields.occupationGroup}
          onChange={set("occupationGroup")}
          options={Object.entries(OCCUPATION_GROUP_FA).map(([value, label]) => ({ value, label }))}
          placeholder="— همه —"
        />
        <SelectField
          label="جنسیت"
          value={fields.gender}
          onChange={set("gender")}
          options={[{ value: "MALE", label: "مرد" }, { value: "FEMALE", label: "زن" }]}
          placeholder="— همه —"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setFields({ firstName: "", lastName: "", nationalCode: "", mobile: "", province: "", city: "", occupationGroup: "", gender: "" });
            onSearch({});
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          پاک کردن
        </button>
        <button
          type="button"
          onClick={() => {
            const params: Record<string, string> = {};
            (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => {
              if (fields[k]) params[k] = fields[k];
            });
            onSearch(params);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Search size={12} />
          جستجو
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { toasts, show: showToast } = useToast();

  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === activeId) ?? null,
    [customers, activeId]
  );

  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedParams, setAdvancedParams] = useState<Record<string, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.findAll({
        search: search.trim() || undefined,
        page: meta.page,
        pageSize: meta.pageSize,
        ...params,
      } as any);
      const data = res.data as any;
      setCustomers(data.items ?? []);
      setMeta(data.meta ?? { total: 0, page: 1, pageSize: 20, totalPages: 1 });
      if ((data.items ?? []).length > 0 && !activeId) {
        setActiveId(data.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [search, meta.page, meta.pageSize, activeId]);

  useEffect(() => {
    fetchData(advancedParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch detail when activeId changes
  useEffect(() => {
    if (!activeId) { setDetailCustomer(null); return; }
    setDetailLoading(true);
    customersApi.findOne(activeId)
      .then((res) => setDetailCustomer(res.data as any))
      .catch(() => setDetailCustomer(activeCustomer))
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  const handleSearch = () => fetchData(advancedParams);

  const handleAdvancedSearch = (params: Record<string, string>) => {
    setAdvancedParams(params);
    fetchData(params);
  };

  const handleDeleted = () => {
    setActiveId(null);
    setDetailCustomer(null);
    fetchData(advancedParams);
  };

  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastContainer toasts={toasts} />

      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">مدیریت مشتریان</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            مشتریان را مشاهده، جستجو، ویرایش و مدیریت کنید
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <UserPlus size={15} />
          مشتری جدید
        </button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
            <Users size={14} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{meta.total}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">مشتری</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-3">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="جستجو در مشتریان..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
              />
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                advancedOpen
                  ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
              )}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {/* Advanced search */}
          <AdvancedSearch open={advancedOpen} onSearch={handleAdvancedSearch} />

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={22} />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />
                {error}
              </div>
              <button
                onClick={() => fetchData(advancedParams)}
                className="mt-2 text-xs text-red-600 underline dark:text-red-400"
              >
                تلاش مجدد
              </button>
            </div>
          ) : customers.length === 0 ? (
            <EmptyState onAdd={() => setCreateOpen(true)} />
          ) : (
            <div className="flex flex-col gap-2">
              {customers.map((c) => (
                <CustomerCard
                  key={c.id}
                  customer={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
              <button
                disabled={meta.page <= 1}
                onClick={() => { setMeta((m) => ({ ...m, page: m.page - 1 })); fetchData({ ...advancedParams, page: String(meta.page - 1) }); }}
                className="text-xs text-gray-500 disabled:opacity-40 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                قبلی
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => { setMeta((m) => ({ ...m, page: m.page + 1 })); fetchData({ ...advancedParams, page: String(meta.page + 1) }); }}
                className="text-xs text-gray-500 disabled:opacity-40 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                بعدی
              </button>
            </div>
          )}
        </aside>

        {/* Detail panel */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {detailLoading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <Spinner size={22} />
            </div>
          ) : !detailCustomer ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <NoSelection />
            </div>
          ) : (
            <CustomerDetailPanel
              key={detailCustomer.id}
              customer={detailCustomer}
              onRefresh={() => {
                fetchData(advancedParams);
                customersApi.findOne(detailCustomer.id).then((r) => setDetailCustomer(r.data as any));
              }}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* Delete button */}
      {detailCustomer && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            حذف این مشتری
          </button>
        </div>
      )}

      <CreateCustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={() => fetchData(advancedParams)}
        showToast={showToast}
      />

      <DeleteCustomerModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        customer={detailCustomer}
        onDelete={handleDeleted}
        showToast={showToast}
      />
    </div>
  );
}
