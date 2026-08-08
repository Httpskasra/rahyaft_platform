import type { DepartmentRelationType } from "@/lib/api/departments";
import { cn } from "@/lib/cn";

export const RELATION_TYPES: DepartmentRelationType[] = [
  "SUPPORTS",
  "COLLABORATES",
  "AUDITS",
  "SERVES",
];

export const RELATION_LABELS: Record<DepartmentRelationType, string> = {
  SUPPORTS: "پشتیبانی از",
  COLLABORATES: "همکاری با",
  AUDITS: "حسابرسی",
  SERVES: "خدمت‌رسانی به",
};

const RELATION_COLORS: Record<
  DepartmentRelationType,
  { bg: string; text: string; darkBg: string; darkText: string; dot: string }
> = {
  SUPPORTS: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
    dot: "bg-blue-500",
  },
  COLLABORATES: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  AUDITS: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    darkBg: "dark:bg-amber-500/10",
    darkText: "dark:text-amber-400",
    dot: "bg-amber-500",
  },
  SERVES: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    darkBg: "dark:bg-purple-500/10",
    darkText: "dark:text-purple-400",
    dot: "bg-purple-500",
  },
};



export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// Relation badge
// ─────────────────────────────────────────────────────────────
export function RelationBadge({ type }: { type: DepartmentRelationType }) {
  const c = RELATION_COLORS[type];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", c.bg, c.text, c.darkBg, c.darkText)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {RELATION_LABELS[type]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Department card (sidebar list)
// ─────────────────────────────────────────────────────────────

