"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Hash, Search, UserRound, Wrench } from "lucide-react";
import {
  getRepairCustomerName,
  repairsApi,
  type RepairCase,
} from "@/lib/api/repairs";
import { Spinner } from "@/components/ui/Spinner";
import {
  STATUS_COLORS,
  STATUS_FA,
} from "@/features/repairs/components/repairConfig";

export default function RepairsDevicesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [repairs, setRepairs] = useState<RepairCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search");
    if (initialSearch) {
      setSearch(initialSearch);
      setDebouncedSearch(initialSearch);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    repairsApi
      .findAll({
        page: 1,
        limit: 100,
        search: debouncedSearch || undefined,
      })
      .then((response) => {
        if (!cancelled) setRepairs(response.data.items);
      })
      .catch(() => {
        if (!cancelled) setError("دریافت فهرست دستگاه‌ها ناموفق بود");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const devices = useMemo(() => {
    const byDevice = new Map<string, RepairCase>();
    for (const repair of repairs) {
      const key =
        repair.serialNumber?.trim().toLocaleLowerCase() ||
        `${repair.deviceTitle.trim().toLocaleLowerCase()}\0${repair.customerId}`;
      if (!byDevice.has(key)) byDevice.set(key, repair);
    }
    return [...byDevice.values()];
  }, [repairs]);

  return (
    <div dir="rtl" className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          محصولات و دستگاه‌ها
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
          مشاهده دستگاه، مشتری مالک و آخرین پرونده تعمیر مرتبط
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search
          size={17}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجو با نام دستگاه یا شماره سریال..."
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="py-20">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500 dark:border-gray-700">
          دستگاهی پیدا نشد
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((repair) => (
            <article
              key={
                repair.serialNumber ||
                `${repair.deviceTitle}-${repair.customerId}`
              }
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <Wrench size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-gray-900 dark:text-white">
                      {repair.deviceTitle}
                    </h2>
                    <p
                      className="mt-1 flex items-center gap-1 text-xs text-gray-500"
                      dir="ltr">
                      <Hash size={11} />
                      {repair.serialNumber || "بدون شماره سریال"}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-[11px] ${STATUS_COLORS[repair.status]}`}>
                  {STATUS_FA[repair.status]}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                <Link
                  href={`/dashboard/customers?customerId=${repair.customerId}`}
                  className="inline-flex min-w-0 items-center gap-1.5 text-gray-600 hover:text-brand-600 hover:underline dark:text-gray-300 dark:hover:text-brand-400">
                  <UserRound size={14} />
                  <span className="truncate">
                    {getRepairCustomerName(repair.customer)}
                  </span>
                </Link>
                <Link
                  href={`/dashboard/repairs?repairId=${repair.id}`}
                  className="shrink-0 font-medium text-brand-600 hover:underline dark:text-brand-400">
                  مشاهده تعمیر {repair.caseNumber}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
