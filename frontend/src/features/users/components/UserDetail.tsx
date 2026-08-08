"use client";

import { useMemo, useState } from "react";
import {
  Building2, Check, IdCard, Calendar, Hash, MessageSquareOff, Pencil, Phone,
  Plus, ShieldCheck, User, X,
} from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { rolesApi } from "@/lib/api/roles";
import { DetailInfoRow as InfoRow } from "@/components/ui/DetailInfoRow";
import {
  LabeledInput as InputField,
  LabeledSelect as SelectField,
} from "@/components/ui/FormControls";
import { Spinner } from "@/components/ui/Spinner";
import type { ToastType } from "@/hooks/useToast";
import { cn } from "@/lib/cn";
import { IR_PHONE_REGEX } from "@/features/users/components/constants";
import type { Department, Role } from "@/features/users/components/types";

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

export function UserDetail({
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

