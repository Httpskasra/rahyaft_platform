"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { submissionsApi } from "@/lib/api/forms";
import type { SchemaField } from "../types";
import { FieldRenderer } from "./FieldRenderer";

export function SubmitFormPanel({
  formId,
  fields,
  onSubmit,
}: {
  formId: string;
  fields: SchemaField[];
  onSubmit: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await submissionsApi.submit(formId, values);
      setSuccess(true);
      setValues({});
      setTimeout(() => {
        setSuccess(false);
        onSubmit();
      }, 2000);
    } catch {
      setError("خطا در ارسال فرم — دوباره تلاش کنید");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Send size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
          ارسال پاسخ آزمایشی
        </h3>
      </div>
      {success ?
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 py-4">
          <CheckCircle size={20} /> پاسخ ارسال شد! در حال تحلیل…
        </div>
      : <div className="space-y-5" dir="rtl">
          {fields.map((f) => (
            <FieldRenderer
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={(v) => setValues((p) => ({ ...p, [f.id]: v }))}
            />
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-opacity">
            {submitting ?
              <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />}
            {submitting ? "در حال ارسال..." : "ارسال"}
          </button>
        </div>
      }
    </div>
  );
}

// ─── Analytics Dashboard (unchanged apart from submissions table integration) ──
// (I'll include it but omit large chunk for brevity - keep your existing one)

// ─── Main Page ─────────────────────────────────────────────────


