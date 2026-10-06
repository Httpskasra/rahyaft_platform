/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Pencil } from "lucide-react";
import { formsApi, type Form } from "@/lib/api/forms";
import { FieldEditor } from "./FieldEditor";
import type { FieldDef } from "./types";

export function EditFormModal({
  open,
  form,
  onClose,
  onUpdate,
}: {
  open: boolean;
  form: Form | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
const [customId, setCustomId] = useState("");

  // Populate state when the target form changes
  useEffect(() => {
    if (!form) return;
    setName(form.name ?? "");
    setDescription(form.description ?? "");
    setIsActive(form.isActive ?? true);
    setCustomId(form.customId ?? "");

    const existingFields: FieldDef[] =
      (form.schema?.fields as FieldDef[]) ?? [];
    setFields(
      existingFields.length > 0
        ? existingFields
        : [
            {
              id: "field_1",
              type: "text",
              label: "",
              description: "",
              required: false,
              options: [],
            },
          ],
    );
    setError("");
  }, [form]);

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
    if (!form) return;

    setSaving(true);
    setError("");
    try {
      await formsApi.update(form.id, {
        name: name.trim(),
        description: description.trim() || undefined,
          customId: customId.trim() || undefined, // ← اضافه شد

        schema: { fields: validFields },
        isActive,
      });
      onUpdate();
      onClose();
    } catch {
      setError("خطا در ویرایش فرم. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              ویرایش فرم
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
            ×
          </button>
        </div>
            <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          شناسه دستی
        </label>
        <input
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          placeholder="مثلاً: FORM-001"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="ltr"
        />
      </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4" dir="rtl">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Name */}
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

          {/* Description */}
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

          {/* isActive toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                وضعیت فرم
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                فرم غیرفعال برای کاربران قابل پر کردن نیست
              </p>
            </div>
            <button
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive
                  ? "bg-blue-600"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Fields */}
          <FieldEditor fields={fields} setFields={setFields} />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ?
              <Loader2 size={16} className="animate-spin" />
            : <Pencil size={16} />}
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
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

// ─── FormCard ─────────────────────────────────────────────────
