"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  ChevronLeft,
  Search,
} from "lucide-react";
import {
  attendanceApi,
  AttendanceDailySummary,
} from "@/lib/api/attendance";

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR");
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800", className)} />
  );
}

// ─── Row ────────────────────────────────────────────────────────
function SummaryRow({
  item,
  onOpen,
}: {
  item: AttendanceDailySummary;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
          <Calendar size={15} className="text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90" dir="ltr">
            {formatDate(item.date)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.userName ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 sm:flex">
          <LogIn size={13} className="text-emerald-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300" dir="ltr">
            {formatTime(item.firstCheckIn)}
          </span>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <LogOut size={13} className="text-red-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300" dir="ltr">
            {formatTime(item.lastCheckOut)}
          </span>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {item.totalEvents} تردد
        </span>
        <ChevronLeft size={16} className="text-gray-300" />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function AttendanceListPage() {
  const router = useRouter();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<AttendanceDailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await attendanceApi.getDailySummary({
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch {
      setError("خطا در دریافت اطلاعات تردد");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div dir="rtl" lang="fa" className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ترددهای روزانه
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          خلاصه ورود و خروج کاربران به‌تفکیک روز
        </p>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">جستجو با نام</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام کاربر را وارد کنید"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-800/30 dark:text-white"
          />
        </div>
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
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:w-auto"
          >
            <Search size={14} />
            اعمال فیلتر
          </button>
        </div>
      </form>

      {/* List */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 px-5 py-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
          <Clock size={18} className="shrink-0 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            هیچ ترددی برای این فیلتر یافت نشد
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <SummaryRow
              key={`${item.userId}-${item.date}`}
              item={item}
              onOpen={() =>
                router.push(
                  `/dashboard/attendance/${item.userId}?date=${item.date.slice(0, 10)}`
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}