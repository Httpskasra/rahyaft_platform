/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import {
  repairsApi,
  type RepairCase,
  type RepairStatus,
  type RepairType,
} from "@/lib/api/repairs";
import { usersApi, type UserData } from "@/lib/api/users";
import { Spinner } from "@/components/ui/Spinner";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
// ─── Constants ────────────────────────────────────────────────
import {
  CreateRepairModal,
  RepairCard,
  RepairDetail,
} from "@/features/repairs/components";
import Link from "next/link";
import { STATUS_FA, TYPE_FA } from "./components/repairConfig";

export default function RepairsPage() {
  const { toasts, show: showToast } = useToast();

  const [repairs, setRepairs] = useState<RepairCase[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRepair = useMemo(
    () => repairs.find((r) => r.id === activeId) ?? null,
    [repairs, activeId],
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<RepairType | "">("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repairsRes = await repairsApi.findAll({
        page,
        limit: 20,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      const items = repairsRes.data.items;
      setRepairs(items);
      setPagination(repairsRes.data.meta);
      const targetId =
        typeof window !== "undefined" ?
          new URLSearchParams(window.location.search).get("repairId")
        : null;
      if (targetId && items.some((repair) => repair.id === targetId))
        setActiveId(targetId);
      else
        setActiveId((current) =>
          items.some((repair) => repair.id === current) ?
            current
          : (items[0]?.id ?? null),
        );
    } catch {
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fromFilter, page, statusFilter, toFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    usersApi
      .findAll()
      .then((response) => setTechnicians(response.data))
      .catch(() => showToast("error", "خطا در دریافت فهرست تکنسین‌ها"));
  }, [showToast]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setFromFilter("");
    setToFilter("");
    setPage(1);
  };
  const hasFilters = Boolean(
    search || statusFilter || typeFilter || fromFilter || toFilter,
  );

  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastViewport toasts={toasts} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مدیریت تعمیرات
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            پرونده‌های تعمیر را مشاهده، ثبت و پیگیری کنید
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/repairs/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            <BarChart3 size={16} /> تحلیل کلی
          </Link>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
            <Plus size={15} />
            پرونده جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <SlidersHorizontal size={15} />
              جستجو و فیلتر پیشرفته
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام مشتری، شماره پرونده، دستگاه، سریال..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
              />
              <Search
                size={15}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                وضعیت
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as RepairStatus | "");
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  <option value="">همه وضعیت‌ها</option>
                  {Object.entries(STATUS_FA).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                نوع تعمیر
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as RepairType | "");
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  <option value="">همه انواع</option>
                  {Object.entries(TYPE_FA).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                از تاریخ
                <input
                  type="date"
                  value={fromFilter}
                  onChange={(event) => {
                    setFromFilter(event.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                تا تاریخ
                <input
                  type="date"
                  value={toFilter}
                  onChange={(event) => {
                    setToFilter(event.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </label>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                پاک کردن فیلترها
              </button>
            )}
          </div>

          {loading ?
            <div className="flex items-center justify-center py-12">
              <Spinner size={22} />
            </div>
          : error ?
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />
                {error}
              </div>
              <button
                onClick={fetchData}
                className="mt-2 text-xs text-red-600 underline dark:text-red-400">
                تلاش مجدد
              </button>
            </div>
          : repairs.length === 0 ?
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Wrench size={24} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">
                  {hasFilters ? "پرونده‌ای با این فیلترها پیدا نشد" : "هنوز پرونده‌ای ثبت نشده"}
                </p>
                {!hasFilters && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  اولین پرونده تعمیر را ثبت کنید
                </p>}
              </div>
              {!hasFilters && <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                <Plus size={14} />
                پرونده جدید
              </button>}
            </div>
          : <div className="flex flex-col gap-2">
              {repairs.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    active={r.id === activeId}
                    onClick={() => setActiveId(r.id)}
                  />
                ))
              }
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <span>
                  {pagination.total.toLocaleString("fa-IR")} پرونده · صفحه{" "}
                  {page.toLocaleString("fa-IR")} از{" "}
                  {Math.max(pagination.totalPages, 1).toLocaleString("fa-IR")}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="صفحه بعد"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800">
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="صفحه قبل"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-800">
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            </div>
          }
        </aside>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeRepair ?
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Wrench size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                یک پرونده را از ستون چپ انتخاب کنید
              </p>
            </div>
          : <RepairDetail
              key={activeRepair.id}
              repair={activeRepair}
              technicians={technicians}
              showToast={showToast}
              onRefresh={fetchData}
            />
          }
        </div>
      </div>

      <CreateRepairModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={fetchData}
        showToast={showToast}
      />
    </div>
  );
}
