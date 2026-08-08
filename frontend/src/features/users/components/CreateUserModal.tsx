/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { rolesApi } from "@/lib/api/roles";
import { LabeledInput as InputField, LabeledSelect as SelectField } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { ToastType } from "@/hooks/useToast";
import { IR_PHONE_REGEX } from "./constants";
import type { Department, Role } from "./types";

export function CreateUserModal({
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

