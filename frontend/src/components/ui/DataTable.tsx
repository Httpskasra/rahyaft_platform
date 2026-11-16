"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  getRowHref: (row: T) => string;
  emptyMessage?: string;
  /** When supplied, scrolling to the end asks the parent for the next server page. */
  hasMore?: boolean;
  loadMore?: () => void | Promise<void>;
  isLoadingMore?: boolean;
  /** Local (already fetched) tables are revealed in batches of this size. */
  batchSize?: number;
  totalRows?: number;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  getRowHref,
  emptyMessage = "موردی برای نمایش وجود ندارد",
  hasMore,
  loadMore,
  isLoadingMore = false,
  batchSize = 20,
  totalRows,
}: DataTableProps<T>) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const usesServerPagination = hasMore !== undefined && loadMore !== undefined;

  const visibleRows = useMemo(
    () => usesServerPagination ? rows : rows.slice(0, visibleCount),
    [rows, usesServerPagination, visibleCount],
  );
  const canLoadMore = usesServerPagination ? Boolean(hasMore) : visibleCount < rows.length;

  const requestMore = useCallback(async () => {
    if (!canLoadMore || isLoadingMore || loadingRef.current) return;
    if (!usesServerPagination) {
      setVisibleCount((value) => Math.min(value + batchSize, rows.length));
      return;
    }

    loadingRef.current = true;
    try {
      await loadMore?.();
    } finally {
      loadingRef.current = false;
    }
  }, [batchSize, canLoadMore, isLoadingMore, loadMore, rows.length, usesServerPagination]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void requestMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, requestMore]);

  const shownCount = visibleRows.length;
  const knownTotal = totalRows ?? (usesServerPagination ? undefined : rows.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 text-xs font-semibold text-gray-500 backdrop-blur dark:border-gray-800 dark:bg-gray-800/95 dark:text-gray-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn("px-5 py-3.5", column.className)}>
                  {column.header}
                </th>
              ))}
              <th scope="col" className="w-12 px-3 py-3.5">
                <span className="sr-only">مشاهده جزئیات</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleRows.map((row) => {
              const href = getRowHref(row);
              return (
                <tr
                  key={getRowKey(row)}
                  tabIndex={0}
                  role="link"
                  onClick={() => router.push(href)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") router.push(href);
                  }}
                  className="cursor-pointer text-gray-700 outline-none transition-colors hover:bg-brand-50/50 focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 dark:text-gray-200 dark:hover:bg-brand-500/5 dark:focus-visible:bg-brand-500/10">
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-5 py-4", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                  <td className="px-3 py-4 text-left text-gray-400">
                    <ChevronLeft size={17} aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="border-t border-gray-100 px-6 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {emptyMessage}
        </div>
      )}
      {rows.length > 0 && (
        <div ref={sentinelRef} className="flex min-h-12 items-center justify-center border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-800">
          {isLoadingMore ? (
            <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> در حال دریافت موارد بیشتر…</span>
          ) : canLoadMore ? (
            <button type="button" onClick={() => void requestMore()} className="rounded-lg px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
              نمایش موارد بیشتر
            </button>
          ) : (
            <span>{shownCount.toLocaleString("fa-IR")}{knownTotal !== undefined ? ` از ${knownTotal.toLocaleString("fa-IR")}` : ""} مورد نمایش داده شد</span>
          )}
        </div>
      )}
    </div>
  );
}
