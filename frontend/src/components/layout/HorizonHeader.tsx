/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AlignJustify, Bell, Info, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
export function HorizonHeader({
  onOpenSidenavAction,
  brandText,
}: {
  onOpenSidenavAction: () => void;
  brandText: string;
}) {
  const { theme, setTheme, systemTheme } = useTheme();
  const current = theme === "system" ? systemTheme : theme;
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-4 z-40 flex flex-wrap items-center justify-between rounded-xl bg-gradient-to-r from-white/70 via-blue-50/70 to-indigo-100/70 p-2 backdrop-blur-xl dark:bg-gradient-to-r dark:from-[#1f2878]/70 dark:via-[#2a3a9f]/60 dark:to-[#1a1555]/70">
      <div className="mr-[6px]">
        <div className="h-6 w-[224px] pt-1">
          <span className="text-sm font-normal text-indigo-700 dark:text-indigo-300/80">
            صفحات <span className="mx-1">\</span>
          </span>
          <span className="text-sm font-normal capitalize text-indigo-800 dark:text-indigo-200/90">
            {brandText}
          </span>
        </div>
        <p className="shrink text-[28px] font-bold capitalize text-indigo-900 dark:text-indigo-100">
          {brandText}
        </p>
      </div>

      <div className="relative mt-[3px] flex h-[56px] w-3/4 md:max-w-[220px] items-center justify-between gap-2 rounded-full bg-white/80 px-2 py-2 shadow-xl shadow-indigo-200/20 dark:bg-[var(--color-gray-800)]/60 dark:shadow-indigo-900/20 md:w-[365px]">
        {/* Search */}
        {/* <div className="flex h-full flex-1 items-center rounded-full bg-gray-100 text-gray-700 dark:bg-black/30 dark:text-white">
          <span className="pl-3 pr-2">
            <Search className="h-4 w-4 text-gray-400 dark:text-white/70" />
          </span>
          <input
            type="text"
            placeholder="جستجو..."
            className="h-full w-full rounded-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400 dark:placeholder:text-white/60 text-right"
          />
        </div> */}

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenSidenavAction}
          className="flex items-center justify-center rounded-full p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-200/30 xl:hidden"
          aria-label="باز کردن نوار کناری">
          <AlignJustify className="h-5 w-5" />
        </button>

        {/* Icons */}
        <button
          type="button"
          className="rounded-full p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-200/30"
          aria-label="اطلاعات">
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="rounded-full p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-200/30"
          aria-label="اطلاعات بیشتر">
          <Info className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="rounded-full p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-200/30"
          aria-label="تغییر تم"
          onClick={() => setTheme(current === "dark" ? "light" : "dark")}>
          {mounted ?
            current === "dark" ?
              <Sun className="h-4 w-4" />
            : <Moon className="h-4 w-4" />
          : <Sun className="h-4 w-4" />}
        </button>

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-700 dark:text-indigo-300">
              {user.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full p-2 text-indigo-600 hover:bg-red-100 dark:text-indigo-300 dark:hover:bg-red-900/30"
              aria-label="خروج"
              title="خروج">
              {/* Use LogOut icon from lucide-react */}
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
