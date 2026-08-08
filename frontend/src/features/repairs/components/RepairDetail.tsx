/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Check, Hash, Phone, User, Wrench } from "lucide-react";
import {
  repairsApi, type RepairCase, type RepairCaseDetail, type RepairStatus,
} from "@/lib/api/repairs";
import type { UserData } from "@/lib/api/users";
import { DetailInfoRow as InfoRow } from "@/components/ui/DetailInfoRow";
import { Spinner } from "@/components/ui/Spinner";
import { StatusTimeline } from "@/components/repairs/StatusTimeline";
import type { ToastType } from "@/hooks/useToast";
import { cn } from "@/lib/cn";
import {
  STATUS_COLORS, STATUS_FA, STATUS_FLOW, TYPE_FA, formatDate,
} from "./repairConfig";

export function RepairDetail({
  repair: initialRepair,
  technicians,
  showToast,
  onRefresh,
}: {
  repair: RepairCase;
  technicians: UserData[];
  showToast: (type: ToastType, message: string) => void;
  onRefresh: () => void;
}) {
  const [detail, setDetail] = useState<RepairCaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "logs">("info");

  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | "">("");
  const [statusReason, setStatusReason] = useState("");

  const [assigningTech, setAssigningTech] = useState(false);
  const [selectedTech, setSelectedTech] = useState(
    initialRepair.technicianId ?? "",
  );

  const nextStatuses = STATUS_FLOW[initialRepair.status] ?? [];

  useEffect(() => {
    setLoadingDetail(true);
    setDetail(null);
    setSelectedTech(initialRepair.technicianId ?? "");
    setSelectedStatus("");
    setStatusReason("");
    repairsApi
      .findOne(initialRepair.id)
      .then((r) => setDetail(r.data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [initialRepair.id]);

  const handleChangeStatus = async () => {
    if (!selectedStatus) return;
    setChangingStatus(true);
    try {
      await repairsApi.changeStatus(
        initialRepair.id,
        selectedStatus,
        statusReason || undefined,
      );
      showToast("success", "وضعیت تعمیر تغییر یافت");
      onRefresh();
    } catch {
      showToast("error", "خطا در تغییر وضعیت");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAssignTech = async () => {
    if (!selectedTech) return;
    setAssigningTech(true);
    try {
      await repairsApi.assignTechnician(initialRepair.id, selectedTech);
      showToast("success", "تکنسین تخصیص داده شد");
      onRefresh();
    } catch {
      showToast("error", "خطا در تخصیص تکنسین");
    } finally {
      setAssigningTech(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Wrench size={17} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {initialRepair.deviceTitle}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
              #{initialRepair.caseNumber}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-xl px-3 py-1 text-xs font-medium",
            STATUS_COLORS[initialRepair.status],
          )}>
          {STATUS_FA[initialRepair.status]}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        {(["info", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-colors",
              activeTab === tab ?
                "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}>
            {tab === "info" ? "اطلاعات" : "تاریخچه"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {activeTab === "info" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow
                icon={<User size={15} className="text-blue-500" />}
                label="مشتری"
                value={initialRepair.customer.fullName}
              />
              <InfoRow
                icon={<Phone size={15} className="text-emerald-500" />}
                label="شماره تماس"
                value={initialRepair.customer.phoneNumber}
                ltr
              />
              <InfoRow
                icon={<Hash size={15} className="text-purple-500" />}
                label="نوع تعمیر"
                value={TYPE_FA[initialRepair.type]}
              />
              <InfoRow
                icon={<Calendar size={15} className="text-gray-500" />}
                label="تاریخ ثبت"
                value={formatDate(initialRepair.createdAt)}
              />
              {initialRepair.serialNumber && (
                <InfoRow
                  icon={<Hash size={15} className="text-cyan-500" />}
                  label="شماره سریال"
                  value={initialRepair.serialNumber}
                  ltr
                />
              )}
              {initialRepair.technician && (
                <InfoRow
                  icon={<User size={15} className="text-amber-500" />}
                  label="تکنسین"
                  value={initialRepair.technician.name}
                />
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                شرح مشکل
              </p>
              <p className="text-sm text-gray-800 dark:text-white/90">
                {initialRepair.problemDescription}
              </p>
            </div>

            {/* Assign Technician */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                تخصیص تکنسین
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="h-10 flex-1 appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
                  <option value="">-- انتخاب تکنسین --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignTech}
                  disabled={!selectedTech || assigningTech}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    selectedTech && !assigningTech ?
                      "bg-brand-500 text-white hover:bg-brand-600"
                    : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
                  )}>
                  {assigningTech ?
                    <Spinner size={13} />
                  : <Check size={13} />}
                  تخصیص
                </button>
              </div>
            </div>

            {/* Change Status */}
            {nextStatuses.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  تغییر وضعیت
                </p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSelectedStatus(s === selectedStatus ? "" : s)
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedStatus === s ?
                          "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
                      )}>
                      <ArrowRight size={11} />
                      {STATUS_FA[s]}
                    </button>
                  ))}
                </div>
                {selectedStatus && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="دلیل (اختیاری)"
                      className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleChangeStatus}
                      disabled={changingStatus}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                      {changingStatus ?
                        <Spinner size={13} />
                      : <Check size={13} />}
                      ثبت
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "logs" && (
          <StatusTimeline
            logs={detail?.statusLogs ?? []}
            loading={loadingDetail}
            registeredAt={initialRepair.createdAt}
          />
        )}
      </div>
    </div>
  );
}

// ─── Create Repair Modal ──────────────────────────────────────
// ─── Create Repair Modal ──────────────────────────────────────
