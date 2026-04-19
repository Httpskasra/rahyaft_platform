"use client";

// import * as React from "react";
// import Image from "next/image";
import Link from "next/link";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

type Props = {
  mobileOpen: boolean;
  collapsed: boolean;
  onToggleCollapsedAction: () => void;
  onMobileCloseAction?: () => void;
};

export function Sidebar({
  mobileOpen,
  collapsed,
  onToggleCollapsedAction,
  onMobileCloseAction,
}: Props) {
  // Desktop: always visible. Mobile: slide in/out.
  const mobileTranslate = mobileOpen ? "translate-x-0" : "translate-x-full";

  return (
    <aside
      className={[
        "sidebar fixed right-0 top-0 z-[9999] flex h-screen  w-[290px] flex-col overflow-y-hidden border-l border-indigo-200/50 bg-gradient-to-b from-white via-blue-50/80 to-indigo-50/60 backdrop-blur-2xl px-5 duration-300 ease-linear dark:border-gray-700/40 dark:bg-gradient-to-b dark:from-gray-900/50 dark:via-gray-800/40 dark:to-gray-900/50",
        mobileTranslate,
        "lg:static lg:translate-x-0 lg:w-[290px] ",
      ].join(" ")}
      aria-label="نوار کناری">
      {/* Header */}
      <div
        className={[
          "sidebar-header flex items-center gap-2 pb-7 pt-8",
          "justify-between",
        ].join(" ")}>
        <Link href="/" className="flex items-center gap-2">
          <span className="logo">
            {/* لوگو رهیافت طب */}
            <span className="block text-lg font-bold text-gray-900 dark:text-white">
              رهیافت طب
            </span>
          </span>
        </Link>

        {/* Mobile close */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 p-2 text-indigo-600 hover:bg-indigo-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30 lg:hidden"
          onClick={onMobileCloseAction}
          aria-label="بستن نوار کناری">
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Desktop collapse button when collapsed (centered) */}
      {collapsed && (
        <div className="hidden lg:flex justify-center pb-6">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-indigo-200 p-2 text-indigo-600 hover:bg-indigo-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
            onClick={onToggleCollapsedAction}
            aria-label="گسترش نوار کناری">
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
