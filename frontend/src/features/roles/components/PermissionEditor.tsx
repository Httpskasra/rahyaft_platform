/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check, Settings2, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import {
  ACCESS_LEVELS,
  PERMISSION_MODULES,
  SIMPLE_SCOPE_OPTIONS,
  actionsForLevel,
  buildMatrix,
  detectAccessLevel,
  getActionLabel,
  getPermissionKey,
  type SimpleAccessLevel,
} from "./permissionConfig";
import type { PermMatrix, Role, ScopeType } from "./types";

export function PermissionEditor({
  role,
  onSave,
  saving,
  suggestions,
}: {
  role: Role;
  onSave: (matrix: PermMatrix) => Promise<void>;
  saving: boolean;
  suggestions?: Array<{action:string;resource:string;scope:ScopeType}> | null;
}) {
  const resources = useMemo(() => PERMISSION_MODULES.map((m) => m.resource), []);
  const actions = useMemo(() => [...new Set(PERMISSION_MODULES.flatMap((m) => m.actions))], []);
  const [matrix, setMatrix] = useState<PermMatrix>(() => buildMatrix(role, resources, actions));
  const [dirty, setDirty] = useState(false);
  const [advancedResource, setAdvancedResource] = useState<string | null>(null);

  useEffect(() => {
    setMatrix(buildMatrix(role, resources, actions));
    setDirty(false);
    setAdvancedResource(null);
  }, [role.id, resources, actions]);

  useEffect(() => {
    if (!suggestions) return;
    setMatrix(prev => {
      const next = { ...prev };
      for (const suggestion of suggestions) {
        const module = PERMISSION_MODULES.find(m => m.resource === suggestion.resource);
        if (!module?.actions.includes(suggestion.action)) continue;
        const key = getPermissionKey(suggestion.action, suggestion.resource);
        next[key] = { enabled: true, scope: module.scopeMode === "global" ? "ORG_WIDE" : suggestion.scope };
      }
      return next;
    });
    setDirty(true);
  }, [suggestions]);

  function setModuleLevel(resource: string, moduleActions: string[], level: Exclude<SimpleAccessLevel, "CUSTOM">) {
    const enabled = new Set(actionsForLevel(moduleActions, level));
    setMatrix((prev) => {
      const next = { ...prev };
      for (const action of moduleActions) {
        const key = getPermissionKey(action, resource);
        next[key] = { ...(next[key] ?? { scope: "DEPARTMENT" as ScopeType }), enabled: enabled.has(action) };
      }
      return next;
    });
    setDirty(true);
  }

  function setModuleScope(resource: string, moduleActions: string[], scope: ScopeType) {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const action of moduleActions) {
        const key = getPermissionKey(action, resource);
        next[key] = { ...(next[key] ?? { enabled: false }), scope };
      }
      return next;
    });
    setDirty(true);
  }

  function toggleAction(resource: string, action: string) {
    const key = getPermissionKey(action, resource);
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { scope: "DEPARTMENT" }), enabled: !prev[key]?.enabled },
    }));
    setDirty(true);
  }

  const enabledTotal = Object.values(matrix).filter((v) => v.enabled).length;
  const groups = ["مدیریت سازمان", "عملیات", "فرم و فرایند"] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-semibold">دسترسی این نقش را خیلی ساده مشخص کنید</p>
            <p className="mt-1 text-xs leading-6 opacity-80">
              برای هر بخش یک سطح دسترسی انتخاب کنید. فقط اگر نیاز به تنظیم دقیق دارید، «تنظیمات پیشرفته» را باز کنید.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {enabledTotal.toLocaleString("fa-IR")} مجوز فعال
        </span>
        {dirty && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">تغییرات هنوز ذخیره نشده‌اند</span>}
      </div>

      {groups.map((group) => {
        const modules = PERMISSION_MODULES.filter((m) => m.group === group);
        return (
          <section key={group} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{group}</h3>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {modules.map((module) => {
                const enabledActions = module.actions.filter((action) => matrix[getPermissionKey(action, module.resource)]?.enabled);
                const level = detectAccessLevel(module.actions, enabledActions);
                const firstEnabled = enabledActions[0];
                const scope = module.scopeMode === "global" ? "ORG_WIDE" : (firstEnabled
                  ? matrix[getPermissionKey(firstEnabled, module.resource)]?.scope ?? "DEPARTMENT"
                  : matrix[getPermissionKey(module.actions[0], module.resource)]?.scope ?? "DEPARTMENT");
                const isAdvanced = advancedResource === module.resource;

                return (
                  <article key={module.resource} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{module.label}</h4>
                      <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{module.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {ACCESS_LEVELS.map((option) => {
                        const active = level === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            title={option.hint}
                            onClick={() => setModuleLevel(module.resource, module.actions, option.value)}
                            className={cn(
                              "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                              active
                                ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {level === "CUSTOM" && (
                      <p className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400">سطح سفارشی فعال است</p>
                    )}

                    {enabledActions.length > 0 && module.scopeMode !== "global" && (
                      <div className="mt-4">
                        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">این دسترسی روی چه اطلاعاتی اعمال شود؟</label>
                        <select
                          value={scope}
                          onChange={(e) => setModuleScope(module.resource, module.actions, e.target.value as ScopeType)}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                          {SIMPLE_SCOPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setAdvancedResource((prev) => prev === module.resource ? null : module.resource)}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Settings2 size={13} />
                      تنظیمات پیشرفته
                      {isAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {isAdvanced && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                        <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">مجوزهای دقیق این بخش</p>
                        <div className="flex flex-wrap gap-2">
                          {module.actions.map((action) => {
                            const active = matrix[getPermissionKey(action, module.resource)]?.enabled;
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => toggleAction(module.resource, action)}
                                className={cn(
                                  "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                                  active
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                                )}
                              >
                                {active ? "✓ " : ""}{getActionLabel(action)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 flex justify-end rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={async () => { await onSave(matrix); setDirty(false); }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
            dirty && !saving
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
          )}
        >
          {saving ? <Spinner size={14} /> : <Check size={14} />}
          ذخیره دسترسی‌های نقش
        </button>
      </div>
    </div>
  );
}
