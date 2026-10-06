"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import type { Form } from "@/lib/api/forms";
import { FormManagerNav } from "./FormManagerNav";

export function FormManagerHeader({ form }: { form: Form }) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/forms/manage" className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
            <ArrowRight size={13} /> بازگشت به مدیریت فرم‌ها
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${form.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
              {form.isActive ? "فعال" : "غیرفعال"}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              نسخه {form.version}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {form.customId && <span className="font-mono" dir="ltr">{form.customId}</span>}
            <span>{form.schema?.fields?.length ?? 0} فیلد</span>
            <span>{form._count?.submissions ?? 0} پاسخ</span>
          </div>
        </div>
        <Link href={`/dashboard/forms/fill/${form.id}`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
          <FileText size={15} /> پیش‌نمایش فرم <ExternalLink size={13} />
        </Link>
      </div>
      <FormManagerNav formId={form.id} />
    </div>
  );
}
