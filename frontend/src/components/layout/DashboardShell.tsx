"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { HorizonHeader } from "@/components/layout/HorizonHeader";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-[#0d0f1f] dark:via-[#0f1555] dark:to-[#1a1555]">
      {/* پوشش موبایل */}
      {mobileOpen && (
        <button
          aria-label="بستن پوشش نوار کناری"
          className="fixed inset-0 z-[9998] bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileCloseAction={() => setMobileOpen(false)}
        collapsed={false}
        onToggleCollapsedAction={() => {}}
      />

      <div
        className={[
          "flex flex-1 flex-col transition-[padding] duration-300 ease-linear",
        ].join(" ")}>
        <div className="px-4 pt-4 lg:px-6">
          <HorizonHeader
            onOpenSidenavAction={() => setMobileOpen(true)}
            brandText="Dashboard"
          />
        </div>

        <main className="flex-1 px-4 pb-8 pt-6 lg:px-6 ">{children}</main>
      </div>
    </div>
  );
}
