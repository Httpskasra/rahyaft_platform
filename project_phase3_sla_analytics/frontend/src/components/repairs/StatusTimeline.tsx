"use client";

import React from "react";
import {
  Plus,
  Eye,
  CreditCard,
  CheckCircle2,
  XCircle,
  Wrench,
  ShieldCheck,
  PackageCheck,
  Truck,
  Archive,
  Ban,
  HelpCircle,
  Clock,
  type LucideIcon,
  User2,
} from "lucide-react";
import type { RepairStatus, RepairStatusLog } from "@/lib/api/repairs";
import { cn } from "@/lib/cn";



export const STATUS_FA: Record<RepairStatus, string> = {
  REGISTERED: "ثبت شده",
  WAITING_REVIEW: "در انتظار بررسی",
  WAITING_COST_APPROVAL: "در انتظار تایید هزینه",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
  IN_REPAIR: "در حال تعمیر",
  QC: "کنترل کیفیت",
  READY_FOR_DELIVERY: "آماده تحویل",
  DELIVERED: "تحویل داده شده",
  CLOSED: "بسته شده",
  CANCELED: "لغو شده",
  NO_REPAIR_REQUIRED: "نیاز به تعمیر ندارد",
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  REGISTERED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  WAITING_REVIEW: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  WAITING_COST_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  IN_REPAIR: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  QC: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  READY_FOR_DELIVERY: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  DELIVERED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  CLOSED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  CANCELED: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  NO_REPAIR_REQUIRED: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

// رنگ دات/خط timeline برای هر وضعیت (پررنگ‌تر از بج‌ها، برای نقطه‌ی روی خط)
const STATUS_DOT: Record<RepairStatus, string> = {
  REGISTERED: "bg-gray-400 dark:bg-gray-500",
  WAITING_REVIEW: "bg-blue-500",
  WAITING_COST_APPROVAL: "bg-amber-500",
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  IN_REPAIR: "bg-purple-500",
  QC: "bg-indigo-500",
  READY_FOR_DELIVERY: "bg-teal-500",
  DELIVERED: "bg-cyan-500",
  CLOSED: "bg-gray-400 dark:bg-gray-500",
  CANCELED: "bg-red-500",
  NO_REPAIR_REQUIRED: "bg-orange-500",
};

const STATUS_ICON: Record<RepairStatus, LucideIcon> = {
  REGISTERED: Plus,
  WAITING_REVIEW: Eye,
  WAITING_COST_APPROVAL: CreditCard,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  IN_REPAIR: Wrench,
  QC: ShieldCheck,
  READY_FOR_DELIVERY: PackageCheck,
  DELIVERED: Truck,
  CLOSED: Archive,
  CANCELED: Ban,
  NO_REPAIR_REQUIRED: HelpCircle,
};

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    const dateStr = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    const timeStr = new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return { dateStr, timeStr };
  } catch {
    return { dateStr: d, timeStr: "" };
  }
}

function relativeFromNow(d?: string | null) {
  if (!d) return "";
  const diffMs = Date.now() - new Date(d).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "همین الان";
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ساعت پیش`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} روز پیش`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} ماه پیش`;
}

// ─── Single timeline item ──────────────────────────────────────
function TimelineItem({
  log,
  isFirst,
  isLast,
}: {
  log: RepairStatusLog;
  isFirst: boolean;
  isLast: boolean;
}) {
  const Icon = STATUS_ICON[log.newStatus] ?? Clock;
  const { dateStr, timeStr } = formatDateTime(log.createdAt) as { dateStr: string; timeStr: string };

  return (
    <div className="relative flex gap-4">
      {/* Connector line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ring-4 ring-white dark:ring-gray-900",
            STATUS_DOT[log.newStatus]
          )}
        >
          <Icon size={15} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-gray-200 to-gray-100 dark:bg-gray-700 dark:bg-none" style={{ minHeight: "24px" }} />
        )}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
        <div className="flex flex-wrap items-center gap-2">
          {log.oldStatus && (
            <>
              <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-medium line-through opacity-60", STATUS_COLORS[log.oldStatus])}>
                {STATUS_FA[log.oldStatus]}
              </span>
              <span className="text-gray-300 dark:text-gray-600">←</span>
            </>
          )}
          <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold", STATUS_COLORS[log.newStatus])}>
            {STATUS_FA[log.newStatus]}
          </span>
          {isFirst && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              وضعیت فعلی
            </span>
          )}
        </div>

        {log.reason && (
          <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{log.reason}</p>
        )}

 <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          <Clock size={11} />
          <span dir="ltr">{dateStr} - {timeStr}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span>{relativeFromNow(log.createdAt)}</span>
          {log.changedBy?.name && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="inline-flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400">
                <User2 size={11} />
                {log.changedBy.name}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main exported timeline ────────────────────────────────────
export function StatusTimeline({
  logs,
  loading,
  registeredAt,
}: {
  logs: RepairStatusLog[];
  loading?: boolean;
  registeredAt?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2 pt-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // مرتب‌سازی نزولی: جدیدترین بالا
  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-10 text-center dark:border-gray-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Clock size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {registeredAt
            ? "هنوز تغییر وضعیتی ثبت نشده؛ پرونده در وضعیت ثبت‌شده قرار دارد"
            : "تاریخچه‌ای وجود ندارد"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {sorted.map((log, i) => (
        <TimelineItem
          key={log.id}
          log={log}
          isFirst={i === 0}
          isLast={i === sorted.length - 1}
        />
      ))}
    </div>
  );
}
