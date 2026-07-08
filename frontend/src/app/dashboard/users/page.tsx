/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/set-state-in-effect */
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
  Building2,
  ShieldCheck,
  Plus,
  Trash2,
  Pencil,
  Users,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  UserPlus,
  ChevronRight,
  IdCard,
  Hash,
  Calendar,
  MessageSquareOff,
} from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────
interface Role {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}


// ─── Toast system ─────────────────────────────────────────────
type ToastType = "success" | "error";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur",
            "animate-in fade-in slide-in-from-bottom-3 duration-300",
            t.type === "success" ?
              "bg-emerald-600 text-white"
            : "bg-red-600 text-white",
          )}>
          {t.type === "success" ?
            <Check size={15} className="shrink-0" />
          : <AlertCircle size={15} className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}



// ─── Spinner ──────────────────────────────────────────────────


// ─── Helpers ──────────────────────────────────────────────────
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

const IR_PHONE_REGEX = /^09[0-9]{9}$/;

// ─── UserCard ─────────────────────────────────────────────────
function UserCard({
  user,
  active,
  onClick,
}: {
  user: UserData;
  active: boolean;
  onClick: () => void;
}) {
  const roleCount = user.roles?.length ?? 0;
  const initials =
    user.name ?
      user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "؟";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active ?
          "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50",
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
              active ?
                "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400",
            )}>
            {initials}
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                active ?
                  "text-brand-700 dark:text-brand-300"
                : "text-gray-800 dark:text-white/90",
              )}>
              {user.name || "بدون نام"}
            </p>
            <p
              className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              dir="ltr">
              {user.phoneNumber || "—"}
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500",
          )}
        />
      </div>

      {roleCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {user.roles.slice(0, 3).map((ur) => (
            <span
              key={ur.role.id}
              className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {ur.role.name}
            </span>
          ))}
          {roleCount > 3 && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              +{roleCount - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── UserDetail Panel ─────────────────────────────────────────
function UserDetail({
  user,
  departments,
  availableRoles,
  onRefresh,
  showToast,
}: {
  user: UserData;
  departments: Department[];
  availableRoles: Role[];
  onRefresh: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "roles">("info");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    phoneNumber: user.phoneNumber,
    departmentId: user.departmentId,
    managerId: user.managerId ?? "",
    employeeCode: user.employeeCode ?? "",
  });
  const [editedRoleIds, setEditedRoleIds] = useState<Set<string>>(new Set());
  const initialRoleIds = useMemo(
    () => new Set(user.roles.map((r) => r.role.id)),
    [user],
  );
  const toggleEditRole = (roleId: string) => {
    setEditedRoleIds((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });
  };
  const userRoleIds = useMemo(
    () => new Set(user.roles.map((r) => r.role.id)),
    [user.roles],
  );

  const assignableRoles = useMemo(
    () => availableRoles.filter((r) => !userRoleIds.has(r.id)),
    [availableRoles, userRoleIds],
  );

  const [assigningRole, setAssigningRole] = useState(false);

  const [resettingChat, setResettingChat] = useState(false);

  const handleResetBaleChat = async () => {
    if (!confirm(`آیا از ریست چت بله کاربر «${user.name}» مطمئن هستید؟`))
      return;
    setResettingChat(true);
    try {
      await usersApi.resetBaleChat(user.id);
      showToast("success", "چت آیدی بله با موفقیت ریست شد");
      onRefresh();
    } catch {
      showToast("error", "خطا در ریست چت آیدی بله");
    } finally {
      setResettingChat(false);
    }
  };
  // ── Edit ──────────────────────────────────────────────────
  const handleEdit = () => {
    setForm({
      name: user.name,
      phoneNumber: user.phoneNumber,
      departmentId: user.departmentId,
      managerId: user.managerId ?? "",
      employeeCode: user.employeeCode ?? "",
    });
    setEditedRoleIds(new Set(user.roles.map((r) => r.role.id)));

    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      showToast("error", "نام و شماره تلفن الزامی هستند");
      return;
    }
    if (!IR_PHONE_REGEX.test(form.phoneNumber.trim())) {
      showToast("error", "شماره موبایل معتبر نیست (مثال: 09121234567)");
      return;
    }
    setSaving(true);
    try {
      await usersApi.update(user.id, {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        departmentId: form.departmentId || undefined,
        managerId: form.managerId || undefined,
        employeeCode: form.employeeCode.trim() || undefined,
      });
      const toRemove = Array.from(initialRoleIds).filter(
        (id) => !editedRoleIds.has(id),
      );
      const toAdd = Array.from(editedRoleIds).filter(
        (id) => !initialRoleIds.has(id),
      );

      await Promise.allSettled([
        ...toRemove.map((roleId) =>
          rolesApi.removeFromUser({ userId: user.id, roleId }),
        ),
        ...toAdd.map((roleId) =>
          rolesApi.assignToUser({ userId: user.id, roleId }),
        ),
      ]);
      showToast("success", "اطلاعات کاربر بروزرسانی شد");
      setEditing(false);
      onRefresh();
    } catch {
      showToast("error", "خطا در بروزرسانی کاربر");
    } finally {
      setSaving(false);
    }
  };

  // ── Role management ───────────────────────────────────────
  const handleAssignRole = async (roleId: string) => {
    setAssigningRole(true);
    try {
      await rolesApi.assignToUser({ userId: user.id, roleId });
      showToast("success", "نقش با موفقیت تخصیص داده شد");
      onRefresh();
    } catch {
      showToast("error", "خطا در تخصیص نقش");
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    setAssigningRole(true);
    try {
      await rolesApi.removeFromUser({ userId: user.id, roleId });
      showToast("success", "نقش از کاربر گرفته شد");
      onRefresh();
    } catch {
      showToast("error", "خطا در حذف نقش");
    } finally {
      setAssigningRole(false);
    }
  };

  const departmentName =
    departments.find((d) => d.id === user.departmentId)?.name ??
    user.departmentId;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <User size={17} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {user.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
              {user.phoneNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetBaleChat}
            disabled={resettingChat}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            {resettingChat ?
              <Spinner size={12} />
            : <MessageSquareOff size={12} />}
            ریست چت بله
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
            <Pencil size={12} />
            ویرایش
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {(["info", "roles"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-colors",
              activeTab === tab ?
                "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}>
            {tab === "info" ? "اطلاعات کاربر" : "نقش‌ها"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "info" && !editing && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow
              icon={<IdCard size={15} className="text-blue-500" />}
              label="نام کامل"
              value={user.name}
            />
            <InfoRow
              icon={<Phone size={15} className="text-emerald-500" />}
              label="شماره موبایل"
              value={user.phoneNumber}
              ltr
            />
            <InfoRow
              icon={<Building2 size={15} className="text-amber-500" />}
              label="دپارتمان"
              value={departmentName}
            />
            <InfoRow
              icon={<IdCard size={15} className="text-cyan-500" />}
              label="کد پرسنلی"
              value={user.employeeCode ?? ""}
              ltr
            />
            <InfoRow
              icon={<Hash size={15} className="text-purple-500" />}
              label="شناسه کاربر"
              value={user.id}
              ltr
              copyable
            />
            <InfoRow
              icon={<Calendar size={15} className="text-gray-500" />}
              label="تاریخ عضویت"
              value={formatDate(user.createdAt)}
            />
          </div>
        )}

        {activeTab === "info" && editing && (
          <div className="space-y-4">
            <InputField
              label="نام کامل"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="نام و نام خانوادگی"
            />
            <InputField
              label="کد پرسنلی"
              value={form.employeeCode}
              onChange={(v) => setForm((f) => ({ ...f, employeeCode: v }))}
              placeholder="کد پرسنلی (برای تطبیق تردد اکسل)"
              ltr
            />
            <InputField
              label="شماره موبایل"
              value={form.phoneNumber}
              onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
              placeholder="09xxxxxxxxx"
              ltr
            />
            <SelectField
              label="دپارتمان"
              value={form.departmentId}
              onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            {availableRoles.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  نقش‌ها
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  {availableRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={editedRoleIds.has(role.id)}
                        onChange={() => toggleEditRole(role.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                انصراف
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                {saving ?
                  <Spinner size={13} />
                : <Check size={14} />}
                ذخیره
              </button>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                نقش‌های اختصاص داده شده
              </h4>
              {user.roles.length === 0 ?
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  هنوز نقشی تخصیص داده نشده است
                </p>
              : <div className="flex flex-wrap gap-2">
                  {user.roles.map((ur) => (
                    <span
                      key={ur.role.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400">
                      <ShieldCheck size={11} />
                      {ur.role.name}
                      <button
                        onClick={() => handleRemoveRole(ur.role.id)}
                        disabled={assigningRole}
                        className="ml-1 text-brand-400 hover:text-red-500 disabled:opacity-50">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              }
            </div>

            {assignableRoles.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  افزودن نقش
                </h4>
                <div className="flex flex-wrap gap-2">
                  {assignableRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleAssignRole(role.id)}
                      disabled={assigningRole}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 transition-colors disabled:opacity-50">
                      <Plus size={11} />
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {assigningRole && (
              <div className="flex justify-center py-2">
                <Spinner size={14} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  ltr,
  copyable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p
          className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white/90"
          dir={ltr ? "ltr" : "rtl"}>
          {value || "—"}
        </p>
      </div>
      {copyable && value && (
        <button
          onClick={handleCopy}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
          {copied ?
            <Check size={12} className="text-emerald-500" />
          : <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          }
        </button>
      )}
    </div>
  );
}

// ─── Form controls ────────────────────────────────────────────
function InputField({
  label,
  value,
  onChange,
  placeholder,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type="text"
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
        <option value="">-- انتخاب کنید --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Users size={24} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">
          هنوز کاربری تعریف نشده
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          اولین کاربر را ایجاد کنید
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
        <UserPlus size={14} />
        ایجاد کاربر
      </button>
    </div>
  );
}

function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <User size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        یک کاربر را از ستون چپ انتخاب کنید
      </p>
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────
function CreateUserModal({
  open,
  onClose,
  departments,
  onCreate,
  roles,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  departments: Department[];
  roles: Role[];
  onCreate: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    departmentId: "",
    managerId: "",
    employeeCode: "",
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        phoneNumber: "",
        departmentId: "",
        managerId: "",
        employeeCode: "",
      });
      setSelectedRoleIds(new Set());
    }
  }, [open]);
  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });
  };
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      showToast("error", "نام و شماره تلفن الزامی هستند");
      return;
    }
    if (!IR_PHONE_REGEX.test(form.phoneNumber.trim())) {
      showToast("error", "شماره موبایل معتبر نیست (مثال: 09121234567)");
      return;
    }
    setCreating(true);
    try {
      const { data: newUser } = await usersApi.create({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        departmentId: form.departmentId,
        managerId: form.managerId || undefined,
        employeeCode: form.employeeCode.trim() || undefined,
      });

      if (selectedRoleIds.size > 0) {
        const assignments = Array.from(selectedRoleIds).map((roleId) =>
          rolesApi.assignToUser({ userId: newUser.id, roleId }),
        );
        await Promise.allSettled(assignments); // خطاها را swallow می‌کنیم، toast جداگانه نمی‌دهیم
      }
      showToast("success", "کاربر با موفقیت ایجاد شد");
      onCreate();
      onClose();
    } catch {
      showToast("error", "خطا در ایجاد کاربر");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ایجاد کاربر جدید"
      subtitle="اطلاعات کاربر را وارد کنید">
      <div className="space-y-4">
        <InputField
          label="نام کامل *"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="نام و نام خانوادگی"
        />
        <InputField
          label="شماره موبایل *"
          value={form.phoneNumber}
          onChange={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
          placeholder="09xxxxxxxxx"
          ltr
        />
        <InputField
          label="کد پرسنلی"
          value={form.employeeCode}
          onChange={(v) => setForm((f) => ({ ...f, employeeCode: v }))}
          placeholder="کد پرسنلی (برای تطبیق تردد اکسل)"
          ltr
        />
        <SelectField
          label="دپارتمان"
          value={form.departmentId}
          onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />
        {roles.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              نقش‌ها
            </label>
            <div className="max-h-36 overflow-y-auto space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            انصراف
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {creating ?
              <Spinner size={13} />
            : <Plus size={14} />}
            ایجاد کاربر
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete User Modal ────────────────────────────────────────
function DeleteUserModal({
  open,
  onClose,
  user,
  onDelete,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
  onDelete: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await usersApi.remove(user.id);
      showToast("success", `کاربر «${user.name}» حذف شد`);
      onDelete();
      onClose();
    } catch {
      showToast("error", "خطا در حذف کاربر");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="حذف کاربر"
      subtitle="این عمل برگشت‌پذیر نیست">
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2.5">
            <AlertCircle
              size={16}
              className="shrink-0 text-red-600 dark:text-red-400"
            />
            <p className="text-sm text-red-700 dark:text-red-300">
              آیا مطمئن هستید که می‌خواهید کاربر <strong>«{user?.name}»</strong>{" "}
              را حذف کنید؟ تمام اطلاعات مرتبط با این کاربر از بین خواهد رفت.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            انصراف
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {deleting ?
              <Spinner size={13} />
            : <Trash2 size={14} />}
            حذف کاربر
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { toasts, show: showToast } = useToast();

  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeUser = useMemo(
    () => users.find((u) => u.id === activeId) ?? null,
    [users, activeId],
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.phoneNumber.includes(q),
    );
  }, [users, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, depsRes, rolesRes] = await Promise.all([
        usersApi.findAll(),
        departmentsApi.findAll(),
        rolesApi.findAll(),
      ]);
      setUsers(usersRes.data);
      setDepartments(depsRes.data as Department[]);
      // rolesApi.findAll ممکن است کل آبجکت نقش را برگرداند، فقط id و name را نگه می‌داریم
      setRoles(
        (rolesRes.data as any[]).map((r: any) => ({ id: r.id, name: r.name })),
      );
      if (usersRes.data.length > 0 && !activeId) {
        setActiveId(usersRes.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserDeleted = () => {
    fetchData();
    if (activeUser && !users.find((u) => u.id === activeUser.id)) {
      setActiveId(null);
    }
  };

  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastContainer toasts={toasts} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مدیریت کاربران
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            کاربران سازمان را مشاهده، ایجاد، ویرایش و مدیریت کنید
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
          <UserPlus size={15} />
          کاربر جدید
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در کاربران..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          {loading ?
            <div className="flex items-center justify-center py-12">
              <Spinner size={22} />
            </div>
          : error ?
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />
                {error}
              </div>
              <button
                onClick={fetchData}
                className="mt-2 text-xs text-red-600 underline dark:text-red-400">
                تلاش مجدد
              </button>
            </div>
          : users.length === 0 ?
            <EmptyState onAdd={() => setCreateOpen(true)} />
          : <div className="flex flex-col gap-2">
              {filtered.length === 0 ?
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  کاربری پیدا نشد
                </p>
              : filtered.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    active={user.id === activeId}
                    onClick={() => setActiveId(user.id)}
                  />
                ))
              }
            </div>
          }
        </aside>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeUser ?
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <NoSelection />
            </div>
          : <UserDetail
              key={activeUser.id}
              user={activeUser}
              departments={departments}
              availableRoles={roles}
              onRefresh={fetchData}
              showToast={showToast}
            />
          }
        </div>
      </div>

      {activeUser && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors">
            <Trash2 size={14} />
            حذف این کاربر
          </button>
        </div>
      )}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        departments={departments}
        onCreate={fetchData}
        showToast={showToast}
        roles={roles}
      />

      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        user={activeUser}
        onDelete={handleUserDeleted}
        showToast={showToast}
      />
    </div>
  );
}
