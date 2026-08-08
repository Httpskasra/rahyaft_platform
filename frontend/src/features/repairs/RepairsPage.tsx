/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Search, Wrench } from "lucide-react";
import {
  repairsApi,
  type RepairCase,
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

export default function RepairsPage() {
  const { toasts, show: showToast } = useToast();

  const [repairs, setRepairs] = useState<RepairCase[]>([]);
  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRepair = useMemo(
    () => repairs.find((r) => r.id === activeId) ?? null,
    [repairs, activeId],
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("fa-IR");
    if (!q) return repairs;

    return repairs.filter((repair) => {
      const deviceTitle = String(repair.deviceTitle ?? "").toLocaleLowerCase(
        "fa-IR",
      );
      const customerName = String(
        repair.customer?.fullName ?? "",
      ).toLocaleLowerCase("fa-IR");
      const caseNumber = String(repair.caseNumber ?? "").toLocaleLowerCase(
        "fa-IR",
      );
      const serialNumber = String(repair.serialNumber ?? "").toLocaleLowerCase(
        "fa-IR",
      );

      return (
        deviceTitle.includes(q) ||
        customerName.includes(q) ||
        caseNumber.includes(q) ||
        serialNumber.includes(q)
      );
    });
  }, [repairs, search]);

  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repairsRes, usersRes] = await Promise.all([
        repairsApi.findAll(),
        usersApi.findAll(),
      ]);
      setRepairs(repairsRes.data);
      setTechnicians(usersRes.data);
      if (repairsRes.data.length > 0 && !activeId)
        setActiveId(repairsRes.data[0].id);
    } catch {
      setError("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchData();
  }, []);

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
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
          <Plus size={15} />
          پرونده جدید
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در پرونده‌ها..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
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
                  هنوز پرونده‌ای ثبت نشده
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  اولین پرونده تعمیر را ثبت کنید
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                <Plus size={14} />
                پرونده جدید
              </button>
            </div>
          : <div className="flex flex-col gap-2">
              {filtered.length === 0 ?
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  پرونده‌ای پیدا نشد
                </p>
              : filtered.map((r) => (
                  <RepairCard
                    key={r.id}
                    repair={r}
                    active={r.id === activeId}
                    onClick={() => setActiveId(r.id)}
                  />
                ))
              }
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
