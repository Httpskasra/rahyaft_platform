import Link from "next/link";
import { BarChart2, ChevronRight, FileText, Pencil, Trash2, Users } from "lucide-react";
import type { Form } from "@/lib/api/forms";

export function FormCard({
  form,
  onDelete,
  onEdit,
}: {
  form: Form;
  onDelete: (id: string) => void;
  onEdit: (form: Form) => void;
}) {
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
            {form.customId && (
  <p className="text-xs font-mono text-blue-500 dark:text-blue-400 mt-0.5">
    #{form.customId}
  </p>
)}
            {form.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {form.description}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          v{form.version}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <FileText size={12} /> {fieldCount} فیلد
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {submissionCount} پاسخ
        </span>
        {/* Active badge */}
        <span
          className={`mr-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            form.isActive
              ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          }`}>
          {form.isActive ? "فعال" : "غیرفعال"}
        </span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <Link
          href={`/dashboard/forms/${form.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 text-xs font-semibold hover:opacity-90">
          مشاهده و تحلیل <ChevronRight size={13} />
        </Link>
        <Link
          href={`/dashboard/forms/${form.id}`}
          className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <BarChart2 size={13} /> آمار
        </Link>
        {/* Edit button */}
        <button
          onClick={() => onEdit(form)}
          className="rounded-xl border border-blue-100 dark:border-blue-900/30 px-2.5 py-2 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-600">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(form.id)}
          className="rounded-xl border border-red-100 dark:border-red-900/30 px-2.5 py-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

