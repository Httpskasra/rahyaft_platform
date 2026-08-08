/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle, CheckSquare, Clock, History, Loader2, XCircle,
} from "lucide-react";
import {
  approvalsApi, type ApprovalInstanceStatus,
} from "@/lib/api/approvals";
import { cn } from "@/lib/cn";

export function ApprovalStatusModal({
  submissionId,
  onClose,
}: {
  submissionId: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ApprovalInstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comment, setComment] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await approvalsApi.getSubmissionStatus(submissionId);
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleAction = async (action: "APPROVED" | "REJECTED") => {
    if (!status || !status.currentStepOrder) return;
    setProcessing(true);
    try {
      await approvalsApi.approveStep(
        submissionId,
        status.currentStepOrder,
        action,
        comment || undefined,
      );
      loadStatus();
      setComment("");
    } catch (err: any) {
      alert(err.response?.data?.message || "خطا در ثبت اقدام");
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </div>
    );

  if (!status)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
          <p className="text-center">
            خط درخواست تأییدی برای این پاسخ وجود ندارد
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-gray-200 px-4 py-2">
            بستن
          </button>
        </div>
      </div>
    );

  const isPending = status.status === "PENDING";
  const currentStep = status.currentStepOrder;
  const canAct = isPending && currentStep !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <History size={18} /> تاریخچه تأیید
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status header */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              {status.status === "APPROVED" && (
                <CheckCircle size={20} className="text-emerald-500" />
              )}
              {status.status === "REJECTED" && (
                <XCircle size={20} className="text-red-500" />
              )}
              {status.status === "PENDING" && (
                <Clock size={20} className="text-amber-500" />
              )}
              <span className="font-bold">
                {status.status === "APPROVED" ?
                  "تأیید نهایی شده"
                : status.status === "REJECTED" ?
                  "رد شده"
                : "در انتظار تأیید"}
              </span>
            </div>
            {status.isCompleted && (
              <span className="text-xs text-gray-400">پایان کار</span>
            )}
          </div>

          {/* Steps timeline */}
          <div className="relative">
            <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-6 relative">
              {Array.from({ length: status.totalSteps }, (_, i) => {
                const stepNum = i + 1;
                const action = status.actions.find(
                  (a) => a.step.stepOrder === stepNum,
                );
                const isCurrent =
                  status.currentStepOrder === stepNum &&
                  status.status === "PENDING";
                const isCompleted = !!action;
                const isRejected = action?.action === "REJECTED";
                return (
                  <div key={stepNum} className="relative pr-8">
                    <div
                      className={cn(
                        "absolute right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-white dark:bg-gray-900",
                        isCompleted ?
                          isRejected ? "border-red-500 text-red-500"
                          : "border-emerald-500 text-emerald-500"
                        : isCurrent ?
                          "border-amber-500 text-amber-500 animate-pulse"
                        : "border-gray-300 text-gray-400",
                      )}>
                      {isCompleted ?
                        isRejected ?
                          <XCircle size={14} />
                        : <CheckCircle size={14} />
                      : stepNum}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            مرحله {stepNum}
                          </p>
                          <p className="text-xs text-gray-400">
                            نقش: {action?.step.role.name || "در انتظار"}
                          </p>
                        </div>
                        {isCompleted && (
                          <div className="text-right text-xs text-gray-400">
                            <p>
                              {new Date(action.createdAt).toLocaleString(
                                "fa-IR",
                              )}
                            </p>
                            <p>توسط: {action.approver.name}</p>
                          </div>
                        )}
                      </div>
                      {isCompleted && action.comments && (
                        <p className="mt-2 text-xs text-gray-500 border-r-2 border-gray-200 pr-2">
                          &quot;{action.comments}&quot;
                        </p>
                      )}
                      {isCurrent && canAct && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            placeholder="توضیحات (اختیاری)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction("APPROVED")}
                              disabled={processing}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                              <CheckSquare size={14} /> تأیید
                            </button>
                            <button
                              onClick={() => handleAction("REJECTED")}
                              disabled={processing}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                              <XCircle size={14} /> رد
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FieldRenderer (for submit) ───────────────────────────────
// ─── JalaliDatePicker ─────────────────────────────────────────
