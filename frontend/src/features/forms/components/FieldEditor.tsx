"use client";

import { Plus, Trash2, X } from "lucide-react";
import type { TableColumn } from "@/lib/api/forms";
import { FIELD_TYPE_LABELS, OPTION_TYPES, type FieldDef, type FieldType } from "./types";

function OptionEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const addOption = () => onChange([...options, ""]);
  const removeOption = (i: number) =>
    onChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) =>
    onChange(options.map((o, idx) => (idx === i ? val : o)));

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        گزینه‌ها
      </p>
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
              className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400">
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
        <Plus size={12} /> افزودن گزینه
      </button>
    </div>
  );
}

// ─── FieldEditor (shared between Create & Edit) ───────────────
export function FieldEditor({
  fields,
  setFields,
}: {
  fields: FieldDef[];
  setFields: React.Dispatch<React.SetStateAction<FieldDef[]>>;
}) {
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
        if (
          key === "type" &&
          OPTION_TYPES.includes(val as FieldType) &&
          updated.options.length === 0
        ) {
          updated.options = [""];
        }
        return updated;
      }),
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          فیلدها
        </label>
        <button
          onClick={addField}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          <Plus size={14} /> افزودن فیلد
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <input
                  value={field.label}
                  onChange={(e) => updateField(idx, "label", e.target.value)}
                  placeholder={`عنوان فیلد ${idx + 1}`}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={field.description}
                  onChange={(e) =>
                    updateField(idx, "description", e.target.value)
                  }
                  placeholder="توضیح فیلد (اختیاری) — راهنمای کاربر"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(idx, "type", e.target.value as FieldType)
                    }
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none">
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </option>
                      ),
                    )}
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

                {OPTION_TYPES.includes(field.type) && (
                  <OptionEditor
                    options={field.options.length ? field.options : [""]}
                    onChange={(opts) => updateField(idx, "options", opts)}
                  />
                )}

                {field.type === "table" && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      ستون‌های جدول
                    </p>
                    <div className="space-y-2 mt-1">
                      {(field.columns ?? []).map((col, colIdx) => (
                        <div
                          key={col.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-900 border">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => {
                              const newCols = [...(field.columns || [])];
                              newCols[colIdx] = {
                                ...col,
                                label: e.target.value,
                              };
                              updateField(idx, "columns", newCols);
                            }}
                            placeholder="نام ستون"
                            className="flex-1 rounded border px-2 py-1 text-sm"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => {
                              const newCols = [...(field.columns || [])];
                              newCols[colIdx] = {
                                ...col,
                                type: e.target.value as
                                  | "text"
                                  | "number"
                                  | "select",
                              };
                              updateField(idx, "columns", newCols);
                            }}
                            className="rounded border px-2 py-1 text-sm">
                            <option value="text">متن</option>
                            <option value="number">عدد</option>
                            <option value="select">انتخابی</option>
                          </select>
                          {col.type === "select" && (
                            <input
                              type="text"
                              value={col.options?.join(", ") || ""}
                              onChange={(e) => {
                                const opts = e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const newCols = [...(field.columns || [])];
                                newCols[colIdx] = { ...col, options: opts };
                                updateField(idx, "columns", newCols);
                              }}
                              placeholder="گزینه‌ها (با کاما جدا کنید)"
                              className="flex-1 rounded border px-2 py-1 text-sm"
                            />
                          )}
                          <button
                            onClick={() => {
                              const newCols = (field.columns || []).filter(
                                (_, i) => i !== colIdx,
                              );
                              updateField(idx, "columns", newCols);
                            }}
                            className="text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newColumn: TableColumn = {
                            id: `col_${Date.now()}_${Math.random()}`,
                            label: "",
                            type: "text",
                          };
                          const newCols = [
                            ...(field.columns || []),
                            newColumn,
                          ];
                          updateField(idx, "columns", newCols);
                        }}
                        className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                        <Plus size={12} /> افزودن ستون
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {fields.length > 1 && (
                <button
                  onClick={() => removeField(idx)}
                  className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 mt-1 shrink-0">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CreateFormModal ───────────────────────────────────────────
