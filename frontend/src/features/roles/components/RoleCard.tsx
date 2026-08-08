import { ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { countPermissions } from "./permissionConfig";
import type { Role } from "./types";

export function RoleCard({
  role,
  active,
  onClick,
}: {
  role: Role;
  active: boolean;
  onClick: () => void;
}) {
  const permCount = countPermissions(role);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active
          ? "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              active
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <ShieldCheck size={15} />
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-gray-800 dark:text-white/90"
              )}
            >
              {role.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {permCount} دسترسی
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500"
          )}
        />
      </div>

      {permCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(role.permissions ?? []).slice(0, 4).map((rp) => (
            <span
              key={rp.id}
              className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {rp.permission.action}.{rp.permission.resource}
            </span>
          ))}
          {permCount > 4 && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              +{permCount - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty / no-selection states
// ─────────────────────────────────────────────────────────────
