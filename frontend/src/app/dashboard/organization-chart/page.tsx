"use client";

import {
  AlertCircle,
  Building2,
  Network,
  UserRoundX,
  Users,
} from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { OrganizationChart } from "@/components/organization-chart/OrganizationChart";
import { Spinner } from "@/components/ui/Spinner";
import { useOrganizationChart } from "@/hooks/useOrganizationChart";

export default function OrganizationChartPage() {
  const { data, loading, error, refetch } = useOrganizationChart();

  return (
    <PermissionGate
      action="read"
      resource="organization-chart"
      fallback={
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          شما اجازه مشاهده چارت سازمانی را ندارید.
        </div>
      }>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            چارت سازمانی
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            نمایش ساختار دپارتمان‌ها، کارکنان، مدیران و ارتباطات سازمانی
          </p>
        </div>

        {loading && (
          <div className="flex min-h-96 items-center justify-center">
            <Spinner />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle size={20} />

            <div className="flex-1">{error}</div>

            <button
              type="button"
              onClick={refetch}
              className="rounded-lg border border-red-300 px-3 py-1.5">
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatisticsCard
                title="کل دپارتمان‌ها"
                value={data.statistics.totalDepartments}
                icon={<Building2 size={20} />}
              />

              <StatisticsCard
                title="کل کارکنان"
                value={data.statistics.totalEmployees}
                icon={<Users size={20} />}
              />

              <StatisticsCard
                title="دپارتمان‌های اصلی"
                value={data.statistics.rootDepartments}
                icon={<Network size={20} />}
              />

              <StatisticsCard
                title="فاقد مدیر مستقیم"
                value={data.statistics.employeesWithoutManager}
                icon={<UserRoundX size={20} />}
              />
            </div>

            <OrganizationChart
              chart={data}
              onRefresh={refetch}
              refreshing={loading}
            />
          </>
        )}
      </div>
    </PermissionGate>
  );
}

function StatisticsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">{title}</div>

          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {value.toLocaleString("fa-IR")}
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {icon}
        </div>
      </div>
    </div>
  );
}
