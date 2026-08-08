"use client";

import { useState } from "react";
import { Building2, GitBranch, Link2, Link2Off, Plus } from "lucide-react";
import type { DepartmentRelationType } from "@/lib/api/departments";
import { Spinner } from "@/components/ui/Spinner";
import {
  RELATION_LABELS,
  RELATION_TYPES,
  RelationBadge,
  formatDate,
} from "./relations";
import type { Department } from "./types";

export function DeptDetail({
  dept,
  allDepts,
  onAddRelation,
  onRemoveRelation,
  addingRelation,
}: {
  dept: Department;
  allDepts: Department[];
  onAddRelation: (toId: string, type: DepartmentRelationType) => Promise<void>;
  onRemoveRelation: (relId: string) => Promise<void>;
  addingRelation: boolean;
}) {
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState<DepartmentRelationType>("SUPPORTS");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const availableTargets = allDepts.filter(
    (d) =>
      d.id !== dept.id &&
      !dept.outgoingRelations.some((r) => r.toDepartmentId === d.id && r.type === relType)
  );

  async function handleAdd() {
    if (!relTarget) return;
    await onAddRelation(relTarget, relType);
    setRelTarget("");
  }

  async function handleRemove(relId: string) {
    setRemovingId(relId);
    try { await onRemoveRelation(relId); } finally { setRemovingId(null); }
  }

  const parentDept = allDepts.find((d) => d.id === dept.parentId);
  const childDepts = allDepts.filter((d) => d.parentId === dept.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">دپارتمان والد</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {parentDept?.name ?? "—  (اصلی)"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">زیردپارتمان‌ها</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {childDepts.length} واحد
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">تاریخ ایجاد</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatDate(dept.createdAt)}
          </p>
        </div>
      </div>

      {/* Children list */}
      {childDepts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GitBranch size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">زیردپارتمان‌ها</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {childDepts.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Building2 size={11} className="text-gray-400" />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relations */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Link2 size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">ارتباطات سازمانی</h3>
        </div>

        {dept.outgoingRelations.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">هنوز ارتباطی ثبت نشده</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dept.outgoingRelations.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <RelationBadge type={rel.type} />
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {rel.toDepartment.name}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(rel.id)}
                  disabled={removingId === rel.id}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {removingId === rel.id ? <Spinner size={12} /> : <Link2Off size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add relation form */}
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/20">
          <p className="mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">افزودن ارتباط جدید</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as DepartmentRelationType)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{RELATION_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              <option value="">انتخاب دپارتمان…</option>
              {availableTargets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!relTarget || addingRelation}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingRelation ? <Spinner size={12} /> : <Plus size={13} />}
              افزودن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
