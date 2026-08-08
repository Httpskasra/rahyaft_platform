import { Lock, Plus, ShieldOff } from "lucide-react";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <ShieldOff size={24} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">
          هنوز نقشی تعریف نشده
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          اولین نقش را ایجاد کنید
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        <Plus size={14} />
        ایجاد نقش
      </button>
    </div>
  );
}

export function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Lock size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        یک نقش را از ستون چپ انتخاب کنید
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
