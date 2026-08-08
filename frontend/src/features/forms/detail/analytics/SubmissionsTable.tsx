"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, ChevronDown, Clock, FileText, Loader2, XCircle } from "lucide-react";
import type { Submission } from "@/lib/api/forms";
import { approvalsApi, type ApprovalInstanceStatus } from "@/lib/api/approvals";
import { exportSubmissionToPDF } from "../exportSubmissionToPdf";
import type { SchemaField } from "../types";

export function SubmissionsTable({
  submissions,
  fields,
  onViewApproval,
  formName,
}: {
  submissions: Submission[];
  fields: SchemaField[];
  onViewApproval: (submissionId: string) => void;
  formName: string;
}) {
  const cols = fields.slice(0, 3);
  const [statusCache, setStatusCache] = useState<
    Record<string, ApprovalInstanceStatus>
  >({});
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>(
    {},
  );

  const fetchStatus = async (submissionId: string) => {
    if (statusCache[submissionId]) return;
    setLoadingStatus((prev) => ({ ...prev, [submissionId]: true }));
    try {
      const { data } = await approvalsApi.getSubmissionStatus(submissionId);
      setStatusCache((prev) => ({ ...prev, [submissionId]: data }));
    } catch {
      // No policy or error
    } finally {
      setLoadingStatus((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  useEffect(() => {
    submissions.forEach((s) => fetchStatus(s.id));
  }, [submissions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={12} /> تأییدشده
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 text-red-500">
            <XCircle size={12} /> ردشده
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-amber-500">
            <Clock size={12} /> در انتظار
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <th className="pb-2 font-medium text-right pr-1">کاربر</th>
            <th className="pb-2 font-medium text-right">تاریخ</th>
            <th className="pb-2 font-medium text-right">وضعیت تأیید</th>
            {cols.map((f) => (
              <th key={f.id} className="pb-2 font-medium text-right">
                {f.label}
              </th>
            ))}
            <th className="pb-2 font-medium text-center">PDF</th>
          </tr>
        </thead>
        <tbody>
          {submissions.slice(0, 20).map((sub) => (
            <tr
              key={sub.id}
              className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="py-2 pr-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {sub.user?.name ?? "ناشناس"}
              </td>
              <td className="py-2 text-gray-400 whitespace-nowrap">
                {new Date(sub.createdAt).toLocaleDateString("fa-IR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2">
                {loadingStatus[sub.id] ?
                  <Loader2 size={12} className="animate-spin" />
                : statusCache[sub.id] ?
                  <button
                    onClick={() => onViewApproval(sub.id)}
                    className="flex items-center gap-1 hover:underline cursor-pointer">
                    {getStatusBadge(statusCache[sub.id].status)}
                    <ChevronDown size={10} />
                  </button>
                : <span className="text-gray-400">—</span>}
              </td>
              {cols.map((f) => {
                const v = sub.data[f.id];
                const display =
                  Array.isArray(v) ? (v as string[]).join(", ")
                  : v != null ? String(v).slice(0, 30)
                  : "—";
                return (
                  <td
                    key={f.id}
                    className="py-2 text-gray-600 dark:text-gray-400 max-w-[110px] truncate">
                    {display || "—"}
                  </td>
                );
              })}
              <td className="py-2 text-center">
                <button
                  onClick={() => exportSubmissionToPDF(sub, formName, fields)}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                  title="خروجی PDF">
                  <FileText size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {submissions.length > 20 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          نمایش ۲۰ مورد از {submissions.length} پاسخ
        </p>
      )}
    </div>
  );
}

// ─── Approval Policy Editor ───────────────────────────────────

