"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { formsApi, type Form } from "@/lib/api/forms";

// ─── Field type definitions ──────────────────────────────────
import {
  CreateFormModal,
  EditFormModal,
  FormCard,
} from "@/features/forms/components";

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await formsApi.findAll();
      setForms(data);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این فرم مطمئن هستید؟")) return;
    try {
      await formsApi.remove(id);
      setForms((f) => f.filter((form) => form.id !== id));
    } catch {
      alert("خطا در حذف فرم");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <CreateFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={load}
      />

      {/* Edit modal — null-safe: only renders when editingForm is set */}
      <EditFormModal
        open={editingForm !== null}
        form={editingForm}
        onClose={() => setEditingForm(null)}
        onUpdate={load}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مدیریت فرم‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            فرم‌های پویا بسازید — پاسخ‌ها به‌صورت خودکار تحلیل می‌شوند
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={16} /> فرم جدید
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "کل فرم‌ها", value: forms.length },
          {
            label: "کل پاسخ‌ها",
            value: forms.reduce((s, f) => s + (f._count?.submissions ?? 0), 0),
          },
          {
            label: "فرم‌های فعال",
            value: forms.filter((f) => f.isActive).length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Forms grid */}
      {loading ?
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      : forms.length === 0 ?
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <FileText
            size={40}
            className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            هنوز فرمی نساختید
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 mx-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={15} /> اولین فرم را بسازید
          </button>
        </div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onDelete={handleDelete}
              onEdit={setEditingForm}
            />
          ))}
        </div>
      }
    </div>
  );
}
