import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getPermissionKey,
  getResourceLabel,
} from "./permissionConfig";
import { PermBadge, ScopeSelect } from "./PermissionControls";
import type {
  PermMatrix,
  PermRowState,
  Resource,
  ScopeType,
} from "./types";

export function ResourceSection({
  resource,
  actions,
  matrix,
  onChange,
  expandedResource,
  onToggleResource,
}: {
  resource: Resource;
  actions: string[];
  matrix: PermMatrix;
  onChange: (
    key: string,
    field: keyof PermRowState,
    value: boolean | ScopeType
  ) => void;
  expandedResource: Resource | null;
  onToggleResource: (r: Resource) => void;
}) {
  const isOpen = expandedResource === resource;

  const enabledCount = actions.filter(
    (a) => matrix[getPermissionKey(a, resource)]?.enabled
  ).length;

  const someOn = enabledCount > 0;
  const allOn = enabledCount === actions.length;

  function toggleAll() {
    const next = !allOn;
    for (const act of actions) {
      onChange(getPermissionKey(act, resource), "enabled", next);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700/60">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleResource(resource)}
        onKeyDown={(e) => e.key === "Enter" && onToggleResource(resource)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-right transition-colors",
          isOpen
            ? "bg-gray-50 dark:bg-gray-800/60"
            : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              someOn
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            )}
          >
            <ShieldCheck size={14} />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {getResourceLabel(resource)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {enabledCount} از {actions.length} دسترسی فعال
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              allOn
                ? "bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            {allOn ? "حذف همه" : "انتخاب همه"}
          </button>
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {actions.map((action) => {
            const key = getPermissionKey(action, resource);
            const state = matrix[key];
            return (
              <div
                key={action}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  state?.enabled
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/50 dark:bg-gray-800/20"
                )}
              >
                <button
                  type="button"
                  onClick={() => onChange(key, "enabled", !state?.enabled)}
                  className={cn(
                    "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200",
                    state?.enabled
                      ? "bg-brand-500 dark:bg-brand-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-checked={state?.enabled}
                  role="switch"
                >
                  <span
                    className={cn(
                      "absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-200",
                      state?.enabled ? "right-0.5" : "left-0.5"
                    )}
                  />
                </button>

                <div className="flex flex-1 items-center gap-2">
                  <PermBadge action={action} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {resource}.{action}
                  </span>
                </div>

                {state?.enabled ? (
                  <div className="w-44 shrink-0">
                    <ScopeSelect
                      value={state.scope}
                      onChange={(v) => onChange(key, "scope", v)}
                    />
                  </div>
                ) : (
                  <div className="w-44 shrink-0">
                    <div className="flex h-9 items-center rounded-xl border border-dashed border-gray-200 px-3 dark:border-gray-700">
                      <span className="text-xs text-gray-400">غیر فعال</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Permission Editor panel
// ─────────────────────────────────────────────────────────────
