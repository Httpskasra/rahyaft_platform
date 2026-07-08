/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  LogIn,
  LogOut,
  Clock,
  Hash,
} from "lucide-react";
import { attendanceApi, AttendanceRecord } from "@/lib/api/attendance";
import { usersApi } from "@/lib/api/users";
import { cn } from "@/lib/cn";



function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800", className)} />
  );
}

// ─── Day group ──────────────────────────────────────────────────
function DayGroup({ date, events }: { date: string; events: AttendanceRecord[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.checkTime).getTime() - new Date(b.checkTime).getTime()
  );
  const firstIn = sorted[0]?.checkTime;
  const lastOut = sorted[sorted.length - 1]?.checkTime;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
            <Calendar size={15} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {formatDate(date)}
            </p>
            <p className="text-xs text-gray-400">{sorted.length} تردد ثبت‌شده</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <LogIn size={13} className="text-emerald-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300" dir="ltr">
              {formatTime(firstIn)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LogOut size={13} className="text-red-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300" dir="ltr">
              {formatTime(lastOut)}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-wrap gap-2">
        {sorted.map((event, i) => {
          const isEntry = i % 2 === 0;
          return (
            <span
              key={event.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
                isEntry
                  ? "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-red-100 bg-red-50/60 text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400"
              )}
            >
              {isEntry ? <LogIn size={12} /> : <LogOut size={12} />}
              <span dir="ltr">{formatTime(event.checkTime)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AttendanceDetailPage() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialDate = searchParams.get("date") ?? "";

  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .findOne(params.userId)
      .then(({ data }) => setUserName(data.name))
      .catch(() => setUserName(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await attendanceApi.findAll({
        userId: params.userId,
        from: from || undefined,
        to: to || undefined,
      });
      setRecords(data);
    } catch {
      setError("خطا در دریافت ترددها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const record of records) {
      const key = dateKey(record.date);
      const list = map.get(key) ?? [];
      list.push(record);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div dir="rtl" lang="fa" className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/attendance/list")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
        >
          <ArrowRight size={15} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            جزئیات ورود و خروج {userName ? `— ${userName}` : ""}
          </h1>
          
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Hash size={12} />
            <span dir="ltr">{params.userId}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3"
      >
        <div>
          <label className="mb-1 block text-xs text-gray-400">از تاریخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-800/30 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">تا تاریخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-800/30 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            اعمال فیلتر
          </button>
        </div>
      </form>

      {/* Content */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 px-5 py-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
          <Clock size={18} className="shrink-0 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            هیچ ترددی برای این بازه یافت نشد
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(([date, events]) => (
            <DayGroup key={date} date={date} events={events} />
          ))}
        </div>
      )}
    </div>
  );
}