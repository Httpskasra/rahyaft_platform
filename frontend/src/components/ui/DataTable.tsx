"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  getRowHref,
  emptyMessage = "موردی برای نمایش وجود ندارد",
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  getRowHref: (row: T) => string;
  emptyMessage?: string;
}) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
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
            {rows.map((row) => {
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
    </div>
  );
}
