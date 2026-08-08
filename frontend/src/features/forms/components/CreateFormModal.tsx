"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { formsApi } from "@/lib/api/forms";
import { FieldEditor } from "./FieldEditor";
import type { FieldDef } from "./types";

export function CreateFormModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([
    {
      id: "field_1",
      type: "text",
      label: "",
      description: "",
      required: false,
      options: [],
    },
  ]);
  const [customId, setCustomId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("نام فرم الزامی است");
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    if (!validFields.length) {
      setError("حداقل یک فیلد با عنوان لازم است");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await formsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        customId: customId.trim() || undefined,
        schema: { fields: validFields },
      });
      onCreate();
      onClose();
      setName("");
      setDescription("");
      setCustomId(""); // ← اضافه شد

      setFields([
        {
          id: "field_1",
          type: "text",
          label: "",
          description: "",
          required: false,
          options: [],
        },
      ]);
    } catch {
      setError("خطا در ایجاد فرم. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            ایجاد فرم جدید
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4" dir="rtl">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              نام فرم *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: فرم ثبت تعمیر"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            شناسه دستی (اختیاری)
          </label>
          <input
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="مثلاً: FORM-001 — باید یکتا باشد"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="ltr"
          />
          <p className="text-xs text-gray-400 mt-1">
            اگر خالی باشد، فقط با ID خودکار ذخیره می‌شود
          </p>
        </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              توضیحات فرم
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="توضیحی کوتاه درباره این فرم..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <FieldEditor fields={fields} setFields={setFields} />
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ?
              <Loader2 size={16} className="animate-spin" />
            : <Plus size={16} />}
            {saving ? "در حال ایجاد..." : "ایجاد فرم"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditFormModal ─────────────────────────────────────────────
