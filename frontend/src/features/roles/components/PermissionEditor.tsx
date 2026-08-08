/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { buildMatrix } from "./permissionConfig";
import { ResourceSection } from "./ResourceSection";
import type {
  PermMatrix,
  PermRowState,
  Resource,
  Role,
  ScopeType,
} from "./types";

export function PermissionEditor({
  role,
  onSave,
  saving,
  resources,
  actions,
}: {
  role: Role;
  onSave: (matrix: PermMatrix) => Promise<void>;
  saving: boolean;
  resources: string[];
  actions: string[];
}) {
  const [matrix, setMatrix] = useState<PermMatrix>(() =>
    buildMatrix(role, resources, actions)
  );
  const [expandedResource, setExpandedResource] = useState<Resource | null>(
    resources[0] ?? null
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setMatrix(buildMatrix(role, resources, actions));
    setDirty(false);
    setExpandedResource(resources[0] ?? null);
  }, [role.id, resources, actions]);

  function handleChange(
    key: string,
    field: keyof PermRowState,
    value: boolean | ScopeType
  ) {
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setDirty(true);
  }

  const enabledTotal = useMemo(
    () => Object.values(matrix).filter((v) => v.enabled).length,
    [matrix]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {enabledTotal} دسترسی فعال
          </span>
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              • ذخیره نشده
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setExpandedResource((prev) =>
              prev === null ? (resources[0] ?? null) : null
            );
          }}
          className="text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
        >
          {expandedResource ? "بستن همه" : "باز کردن همه"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {resources.map((res) => (
          <ResourceSection
            key={res}
            resource={res}
            actions={actions}
            matrix={matrix}
            onChange={handleChange}
            expandedResource={expandedResource}
            onToggleResource={(r) =>
              setExpandedResource((prev) => (prev === r ? null : r))
            }
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave(matrix)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
            dirty && !saving
              ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
          )}
        >
          {saving ? <Spinner size={14} /> : <Check size={14} />}
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role card
// ─────────────────────────────────────────────────────────────
