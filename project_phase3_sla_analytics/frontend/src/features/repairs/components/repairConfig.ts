import type { RepairStatus, RepairType } from "@/lib/api/repairs";

export const STATUS_FA: Record<RepairStatus, string> = {
  REGISTERED: "ثبت شده",
  WAITING_REVIEW: "در انتظار بررسی",
  WAITING_COST_APPROVAL: "در انتظار تایید هزینه",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
  IN_REPAIR: "در حال تعمیر",
  QC: "کنترل کیفیت",
  READY_FOR_DELIVERY: "آماده تحویل",
  DELIVERED: "تحویل داده شده",
  CLOSED: "بسته شده",
  CANCELED: "لغو شده",
  NO_REPAIR_REQUIRED: "نیاز به تعمیر ندارد",
};

export const STATUS_FLOW: Record<string, RepairStatus[]> = {
  REGISTERED: ["WAITING_REVIEW", "CANCELED"],
  WAITING_REVIEW: ["WAITING_COST_APPROVAL", "IN_REPAIR", "NO_REPAIR_REQUIRED"],
  WAITING_COST_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_REPAIR"],
  IN_REPAIR: ["QC"],
  QC: ["READY_FOR_DELIVERY", "IN_REPAIR"],
  READY_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  REGISTERED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  WAITING_REVIEW:
    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  WAITING_COST_APPROVAL:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  IN_REPAIR:
    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  QC: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  READY_FOR_DELIVERY:
    "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  DELIVERED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  CLOSED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  CANCELED: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  NO_REPAIR_REQUIRED:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

export const TYPE_FA: Record<RepairType, string> = {
  IN_HOUSE: "درون‌سازمانی",
  ON_SITE: "در محل",
};

export function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

// ─── Toast ────────────────────────────────────────────────────

// ─── Modal ────────────────────────────────────────────────────

// ─── Form Controls ────────────────────────────────────────────

