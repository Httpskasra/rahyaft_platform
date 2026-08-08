import { ChevronRight, Wrench } from "lucide-react";
import type { RepairCase } from "@/lib/api/repairs";
import { cn } from "@/lib/cn";
import { STATUS_COLORS, STATUS_FA } from "./repairConfig";

export function RepairCard({
  repair,
  active,
  onClick,
}: {
  repair: RepairCase;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active ?
          "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50",
      )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              active ?
                "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400",
            )}>
            <Wrench size={14} />
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                active ?
                  "text-brand-700 dark:text-brand-300"
                : "text-gray-800 dark:text-white/90",
              )}>
              {repair.deviceTitle || "بدون عنوان"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {repair.customer?.fullName || "مشتری نامشخص"}
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500",
          )}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium",
            STATUS_COLORS[repair.status],
          )}>
          {STATUS_FA[repair.status]}
        </span>
        <span
          className="text-[10px] text-gray-400 dark:text-gray-500"
          dir="ltr">
          #{repair.caseNumber || "—"}
        </span>
      </div>
    </button>
  );
}

// ─── Repair Detail ────────────────────────────────────────────

