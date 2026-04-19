"use client";

import React, { useMemo, useState } from "react";
import {
  User,
  Phone,
  Building2,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

// ─── Copy button ─────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

// ─── Info row ─────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  ltr,
  copyable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p
          className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-white/90 truncate"
          dir={ltr ? "ltr" : "rtl"}
        >
          {value || "—"}
        </p>
      </div>
      {copyable && value && <CopyButton text={value} />}
    </div>
  );
}

// ─── Scope badge ─────────────────────────────────────────────
const SCOPE_FA: Record<string, string> = {
  SELF: "فقط خود",
  TEAM: "تیم",
  DEPARTMENT: "دپارتمان",
  DEPARTMENT_SUBTREE: "زیردرخت",
  RELATED_DEPARTMENTS: "دپارتمان‌های مرتبط",
  ORG_WIDE: "کل سازمان",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
  read:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800",
  update: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800",
  delete: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800",
};

// ─── Permission row ───────────────────────────────────────────
function PermRow({
  action,
  resource,
  scope,
}: {
  action: string;
  resource: string;
  scope: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/20">
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium", ACTION_COLORS[action] ?? ACTION_COLORS.read)}>
          {action}
        </span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{resource}</span>
      </div>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {SCOPE_FA[scope] ?? scope}
      </span>
    </div>
  );
}

// ─── Role card ────────────────────────────────────────────────
function RoleCard({ role }: { role: { id: string; name: string; permissions: Array<{ action: string; resource: string; scope: string }> } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        className="flex cursor-pointer items-center justify-between gap-3 bg-white px-5 py-4 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
            <ShieldCheck size={15} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{role.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{role.permissions.length} دسترسی</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={15} className="text-gray-400" />
          : <ChevronDown size={15} className="text-gray-400" />}
      </div>

      {/* Permissions */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/20">
          {role.permissions.length === 0 ? (
            <p className="text-xs text-gray-400">دسترسی تعریف نشده</p>
          ) : (
            <div className="flex flex-col gap-2">
              {role.permissions.map((p, i) => (
                <PermRow key={i} action={p.action} resource={p.resource} scope={p.scope} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800", className)} />;
}

// ─── Main Profile Page ────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading } = useAuth();

  const allPerms = useMemo(() => {
    if (!user) return [];
    return Array.from(
      new Map(
        user.roles
          .flatMap((r) => r.permissions)
          .map((p) => [`${p.action}:${p.resource}`, p])
      ).values()
    );
  }, [user]);

  // avatar initials
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")
    : "?";

  return (
    <div dir="rtl" lang="fa" className="mx-auto max-w-3xl space-y-6">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {/* gradient bar at top */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-brand-500 to-indigo-500 rounded-t-2xl" />

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-500 text-2xl font-bold text-white shadow-lg">
            {loading ? "?" : initials}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-right">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-28 mx-auto sm:mx-0" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {user?.name ?? "—"}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" dir="ltr">
                  {user?.phoneNumber ?? "—"}
                </p>
                {/* Role badges */}
                {user && user.roles.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {user.roles.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400"
                      >
                        <ShieldCheck size={11} />
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Permission count badge */}
          {!loading && (
            <div className="shrink-0 text-center">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{allPerms.length}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">دسترسی فعال</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <InfoRow
              icon={<User size={16} className="text-blue-500" />}
              label="نام کامل"
              value={user?.name ?? ""}
            />
            <InfoRow
              icon={<Phone size={16} className="text-emerald-500" />}
              label="شماره موبایل"
              value={user?.phoneNumber ?? ""}
              ltr
              copyable
            />
            <InfoRow
              icon={<Building2 size={16} className="text-amber-500" />}
              label="شناسه دپارتمان"
              value={user?.departmentId ?? ""}
              ltr
              copyable
            />
            <InfoRow
              icon={<KeyRound size={16} className="text-purple-500" />}
              label="شناسه کاربر"
              value={user?.id ?? ""}
              ltr
              copyable
            />
          </>
        )}
      </div>

      {/* Roles & permissions */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">نقش‌ها و دسترسی‌ها</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : !user || user.roles.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/40">
            <XCircle size={18} className="shrink-0 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">هیچ نقشی به این حساب اختصاص داده نشده</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {user.roles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>

      {/* Active permissions summary */}
      {!loading && allPerms.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">خلاصه دسترسی‌ها</h2>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap gap-2">
              {allPerms.map((p) => (
                <span
                  key={`${p.action}:${p.resource}`}
                  className={cn(
                    "inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-medium",
                    ACTION_COLORS[p.action] ?? ACTION_COLORS.read
                  )}
                >
                  {p.action}.{p.resource}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
