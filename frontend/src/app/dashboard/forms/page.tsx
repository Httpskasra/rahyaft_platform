"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formsApi, Form } from "@/lib/api/forms";
import {
  Plus,
  FileText,
  BarChart2,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  ChevronRight,
  X,
} from "lucide-react";

// ─── Field type definitions ──────────────────────────────────
type FieldType = "text" | "number" | "textarea" | "select" | "radio" | "checkbox";

interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  description: string;
  required: boolean;
  options: string[]; // for select / radio / checkbox
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "متن کوتاه",
  number: "عدد",
  textarea: "متن بلند",
  select: "لیست کشویی",
  radio: "انتخاب تکی (Radio)",
  checkbox: "چک‌باکس (چندگانه)",
};

const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];

// ─── OptionEditor ─────────────────────────────────────────────
function OptionEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const addOption = () => onChange([...options, ""]);
  const removeOption = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) =>
    onChange(options.map((o, idx) => (idx === i ? val : o)));

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">گزینه‌ها</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`گزینه ${i + 1}`}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {options.length > 1 && (
            <button
              onClick={() => removeOption(i)}
              className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1"
      >
        <Plus size={12} /> افزودن گزینه
      </button>
    </div>
  );
}

// ─── CreateFormModal ───────────────────────────────────────────
function CreateFormModal({
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addField = () =>
    setFields((f) => [
      ...f,
      {
        id: `field_${Date.now()}`,
        type: "text",
        label: "",
        description: "",
        required: false,
        options: [],
      },
    ]);

  const removeField = (idx: number) =>
    setFields((f) => f.filter((_, i) => i !== idx));

  const updateField = (idx: number, key: string, val: unknown) =>
    setFields((f) =>
      f.map((field, i) => {
        if (i !== idx) return field;
        const updated = { ...field, [key]: val };
        // When switching to option-based type, seed with one empty option
        if (
          key === "type" &&
          OPTION_TYPES.includes(val as FieldType) &&
          updated.options.length === 0
        ) {
          updated.options = [""];
        }
        return updated;
      })
    );

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
        schema: { fields: validFields },
      });
      onCreate();
      onClose();
      setName("");
      setDescription("");
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
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ایجاد فرم جدید</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4" dir="rtl">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Form name */}
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

          {/* Form description */}
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

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                فیلدها
              </label>
              <button
                onClick={addField}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus size={14} /> افزودن فیلد
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      {/* Label */}
                      <input
                        value={field.label}
                        onChange={(e) => updateField(idx, "label", e.target.value)}
                        placeholder={`عنوان فیلد ${idx + 1}`}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Description */}
                      <input
                        value={field.description}
                        onChange={(e) => updateField(idx, "description", e.target.value)}
                        placeholder="توضیح فیلد (اختیاری) — راهنمای کاربر"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Type + Required row */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(idx, "type", e.target.value as FieldType)
                          }
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none"
                        >
                          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                            <option key={t} value={t}>
                              {FIELD_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>

                        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(idx, "required", e.target.checked)
                            }
                            className="rounded"
                          />
                          الزامی
                        </label>
                      </div>

                      {/* Options editor for select / radio / checkbox */}
                      {OPTION_TYPES.includes(field.type) && (
                        <OptionEditor
                          options={field.options.length ? field.options : [""]}
                          onChange={(opts) => updateField(idx, "options", opts)}
                        />
                      )}
                    </div>

                    {fields.length > 1 && (
                      <button
                        onClick={() => removeField(idx)}
                        className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 mt-1 shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "در حال ایجاد..." : "ایجاد فرم"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FormCard ─────────────────────────────────────────────────
function FormCard({ form, onDelete }: { form: Form; onDelete: (id: string) => void }) {
  const fieldCount = form.schema?.fields?.length ?? 0;
  const submissionCount = form._count?.submissions ?? 0;

  return (
    <div className="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {form.name}
            </h3>
            {form.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {form.description}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">v{form.version}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <FileText size={12} /> {fieldCount} فیلد
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {submissionCount} پاسخ
        </span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <Link
          href={`/dashboard/forms/${form.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 text-xs font-semibold hover:opacity-90"
        >
          مشاهده و تحلیل <ChevronRight size={13} />
        </Link>
        <Link
          href={`/dashboard/forms/${form.id}`}
          className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <BarChart2 size={13} /> آمار
        </Link>
        <button
          onClick={() => onDelete(form.id)}
          className="rounded-xl border border-red-100 dark:border-red-900/30 px-2.5 py-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">مدیریت فرم‌ها</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            فرم‌های پویا بسازید — پاسخ‌ها به‌صورت خودکار تحلیل می‌شوند
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
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
          { label: "فرم‌های فعال", value: forms.filter((f) => f.isActive).length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Forms grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">هنوز فرمی نساختید</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 mx-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={15} /> اولین فرم را بسازید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
