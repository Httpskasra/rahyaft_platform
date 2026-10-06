import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SCOPE_LABELS,
  getActionColor,
  getActionLabel,
} from "./permissionConfig";
import type { ScopeType } from "./types";

export function PermBadge({ action }: { action: string }) {
  const c = getActionColor(action);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        c.bg,
        c.text,
        c.darkBg,
        c.darkText
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {getActionLabel(action)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Scope select
// ─────────────────────────────────────────────────────────────
export function ScopeSelect({
  value,
  onChange,
}: {
  value: ScopeType;
  onChange: (v: ScopeType) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ScopeType)}
        className="h-9 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
      >
        {(Object.keys(SCOPE_LABELS) as ScopeType[]).map((s) => (
          <option key={s} value={s}>
            {SCOPE_LABELS[s]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <Globe size={13} />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Permission matrix types
// ─────────────────────────────────────────────────────────────
