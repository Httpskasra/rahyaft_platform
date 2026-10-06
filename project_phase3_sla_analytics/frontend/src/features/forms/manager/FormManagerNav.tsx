"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, LayoutDashboard, ListChecks, Settings2, Workflow } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { key: "overview", label: "نمای کلی", icon: LayoutDashboard, suffix: "" },
  { key: "builder", label: "طراحی فرم", icon: ClipboardList, suffix: "/builder" },
  { key: "submissions", label: "پاسخ‌ها", icon: ListChecks, suffix: "/submissions" },
  { key: "analytics", label: "تحلیل", icon: BarChart3, suffix: "/analytics" },
  { key: "approval", label: "گردش تأیید", icon: Workflow, suffix: "/approval" },
  { key: "settings", label: "تنظیمات", icon: Settings2, suffix: "/settings" },
] as const;

export function FormManagerNav({ formId }: { formId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/forms/manage/${formId}`;

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-max gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {tabs.map(({ key, label, icon: Icon, suffix }) => {
          const href = `${base}${suffix}`;
          const active = key === "overview" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
