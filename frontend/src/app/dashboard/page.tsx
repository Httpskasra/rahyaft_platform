"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  Users,
  TrendingUp,
  Activity,
  ArrowLeft,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { usersApi } from "@/lib/api/users";
import { usePermission } from "@/hooks/usePermission";

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
  href,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  loading?: boolean;
}) {
  const inner = (
    <div className={cn(
      "group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 transition-all dark:border-gray-800 dark:bg-gray-900",
      href && "hover:border-brand-200 hover:shadow-sm dark:hover:border-brand-800 cursor-pointer"
    )}>
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : (
          <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        )}
      </div>
      {href && (
        <ArrowLeft size={16} className="shrink-0 text-gray-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-brand-500 dark:text-gray-600" />
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Role badge ───────────────────────────────────────────────
function RoleBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400">
      <ShieldCheck size={11} />
      {name}
    </span>
  );
}

// ─── Permission chip ──────────────────────────────────────────
function PermChip({ action, resource }: { action: string; resource: string }) {
  const colors: Record<string, string> = {
    create: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
    read:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
    update: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800",
    delete: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
  };
  return (
    <span className={cn("inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium", colors[action] ?? colors.read)}>
      {action}.{resource}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const canReadDepts  = usePermission("read", "departments");
  const canReadRoles  = usePermission("read", "roles");
  const canReadUsers  = usePermission("read", "users");

  const [deptCount,  setDeptCount]  = useState<number>(0);
  const [roleCount,  setRoleCount]  = useState<number>(0);
  const [userCount,  setUserCount]  = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadStats() {
      setStatsLoading(true);
      const results = await Promise.allSettled([
        canReadDepts ? departmentsApi.findAll() : Promise.resolve(null),
        canReadRoles ? rolesApi.findAll()        : Promise.resolve(null),
        canReadUsers ? usersApi.findAll()         : Promise.resolve(null),
      ]);

      if (results[0].status === "fulfilled" && results[0].value)
        setDeptCount(results[0].value.data?.length ?? 0);
      if (results[1].status === "fulfilled" && results[1].value)
        setRoleCount(results[1].value.data?.length ?? 0);
      if (results[2].status === "fulfilled" && results[2].value)
        setUserCount(results[2].value.data?.length ?? 0);

      setStatsLoading(false);
    }

    loadStats();
  }, [authLoading, canReadDepts, canReadRoles, canReadUsers]);

  // flatten all permissions across all roles
  const allPerms = user?.roles.flatMap((r) => r.permissions) ?? [];
  const uniquePerms = Array.from(
    new Map(allPerms.map((p) => [`${p.action}:${p.resource}`, p])).values()
  );

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "صبح بخیر" : hour < 17 ? "روز بخیر" : "عصر بخیر";

  return (
    <div dir="rtl" lang="fa" className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-brand-500 to-indigo-600 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/70">{greeting}،</p>
          <h1 className="mt-1 text-2xl font-bold">
            {authLoading ? "..." : (user?.name ?? "کاربر")}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            به پنل مدیریت رهیافت طب خوش آمدید
          </p>
        </div>
        {/* decorative circles */}
        <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-10 top-2 h-20 w-20 rounded-full bg-white/5" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="دپارتمان‌ها"
          value={deptCount}
          loading={statsLoading}
          icon={<Building2 size={20} className="text-blue-600 dark:text-blue-400" />}
          color="bg-blue-50 dark:bg-blue-500/10"
          href={canReadDepts ? "/dashboard/departments" : undefined}
        />
        <StatCard
          label="نقش‌های سیستم"
          value={roleCount}
          loading={statsLoading}
          icon={<ShieldCheck size={20} className="text-purple-600 dark:text-purple-400" />}
          color="bg-purple-50 dark:bg-purple-500/10"
          href={canReadRoles ? "/dashboard/roles" : undefined}
        />
        <StatCard
          label="کاربران"
          value={userCount}
          loading={statsLoading}
          icon={<Users size={20} className="text-emerald-600 dark:text-emerald-400" />}
          color="bg-emerald-50 dark:bg-emerald-500/10"
          href={canReadUsers ? undefined : undefined}
        />
      </div>

      {/* Bottom grid: user info + permissions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* User info card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-2">
            <Activity size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              اطلاعات حساب کاربری
            </h2>
          </div>

          {authLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow label="نام" value={user?.name ?? "—"} />
              <InfoRow label="شماره موبایل" value={user?.phoneNumber ?? "—"} ltr />
              <InfoRow
                label="نقش‌ها"
                value={
                  user && user.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {user.roles.map((r) => <RoleBadge key={r.id} name={r.name} />)}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow
                label="دسترسی‌ها"
                value={
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>{uniquePerms.length} دسترسی فعال</span>
                  </div>
                }
              />
            </div>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              مشاهده پروفایل کامل
              <ArrowLeft size={12} />
            </Link>
          </div>
        </div>

        {/* Permissions card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                دسترسی‌های فعال
              </h2>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {uniquePerms.length}
            </span>
          </div>

          {authLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-6 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : uniquePerms.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">هیچ دسترسی فعالی یافت نشد</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {uniquePerms.map((p) => (
                <PermChip key={`${p.action}:${p.resource}`} action={p.action} resource={p.resource} />
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
            <Clock size={13} className="shrink-0 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              آخرین ورود:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {now.toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────
function InfoRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className="text-sm font-medium text-gray-800 dark:text-white/90 text-left"
        dir={ltr ? "ltr" : "rtl"}
      >
        {value}
      </span>
    </div>
  );
}
