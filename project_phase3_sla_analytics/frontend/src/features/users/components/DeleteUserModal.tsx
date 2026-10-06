"use client";

import { useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { ToastType } from "@/hooks/useToast";

export function DeleteUserModal({
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

