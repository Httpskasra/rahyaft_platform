"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { attendanceApi, AttendanceImportResult } from "@/lib/api/attendance";
import { cn } from "@/lib/cn";



const ACCEPTED_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// ─── Stat tile ─────────────────────────────────────────────────
function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClasses: Record<string, string> = {
    neutral:
      "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30",
    success:
      "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-500/10",
    warning:
      "border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-500/10",
  };

  return (
    <div className={cn("rounded-2xl border px-5 py-4", toneClasses[tone])}>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AttendanceImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttendanceImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateAndSetFile(selected: File | null) {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("فقط فایل‌های اکسل (.xls یا .xlsx) پذیرفته می‌شوند");
      return;
    }
    setError(null);
    setResult(null);
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await attendanceApi.import(file);
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "خطا در بارگذاری فایل. دوباره تلاش کنید"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" lang="fa" className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          بارگذاری فایل تردد
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          فایل خلاصه گزارش تردد (اکسل) را بارگذاری کنید تا ساعات ورود و خروج
          کاربران به‌صورت خودکار ثبت شود.
        </p>
      </div>

      {/* Upload box */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragActive
              ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
              : "border-gray-200 hover:border-brand-300 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-800/30"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <FileSpreadsheet
                  size={22}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {file.name}
              </p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(1)} کیلوبایت — برای تغییر فایل
                کلیک کنید
              </p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
                <UploadCloud
                  size={22}
                  className="text-brand-600 dark:text-brand-400"
                />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                فایل اکسل را اینجا رها کنید یا کلیک کنید
              </p>
              <p className="text-xs text-gray-400">فرمت پذیرفته‌شده: .xls, .xlsx</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400">
            <XCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!file || submitting}
          onClick={handleSubmit}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors",
            !file || submitting
              ? "cursor-not-allowed bg-gray-300 dark:bg-gray-700"
              : "bg-brand-500 hover:bg-brand-600"
          )}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              در حال پردازش...
            </>
          ) : (
            "بارگذاری و ثبت ترددها"
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              نتیجه پردازش فایل
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="ردیف‌های پردازش‌شده"
              value={result.totalRowsProcessed}
              tone="neutral"
            />
            <StatTile
              label="کاربران منطبق"
              value={result.matchedUsers}
              tone="success"
            />
            <StatTile
              label="ترددهای جدید ثبت‌شده"
              value={result.recordsCreated}
              tone="success"
            />
            <StatTile
              label="موارد تکراری (نادیده‌گرفته‌شده)"
              value={result.recordsSkippedExisting}
              tone="neutral"
            />
            <StatTile
              label="ساعات نامعتبر"
              value={result.invalidTimeEntries}
              tone="neutral"
            />
            <StatTile
              label="کدهای پرسنلی نامنطبق"
              value={result.unmatchedEmployeeCodes.length}
              tone={result.unmatchedEmployeeCodes.length > 0 ? "warning" : "neutral"}
            />
          </div>

          {result.unmatchedEmployeeCodes.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-900 dark:bg-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    کدهای پرسنلی زیر در سیستم یافت نشدند:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.unmatchedEmployeeCodes.map((code) => (
                      <span
                        key={code}
                        dir="ltr"
                        className="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-gray-800 dark:text-amber-400"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                    برای ثبت ترددهای این کدها، فیلد «کد پرسنلی» کاربر متناظر را
                    تکمیل کنید و فایل را دوباره بارگذاری کنید.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
