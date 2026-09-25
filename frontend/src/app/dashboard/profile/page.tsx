"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  PenLine,
  Eraser,
  Save,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";
import { usersApi } from "@/lib/api/users";


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


// ─── Signature pad ────────────────────────────────────────────
function SignatureSection() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    usersApi.getMySignature()
      .then(({ data }) => {
        if (mounted) setSavedSignature(data.signatureDataUrl);
      })
      .catch(() => {
        if (mounted) setMessage({ type: "error", text: "دریافت امضای فعلی ناموفق بود." });
      })
      .finally(() => {
        if (mounted) setLoadingSignature(false);
      });
    return () => { mounted = false; };
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasStroke(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setMessage(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) {
      setMessage({ type: "error", text: "ابتدا امضای خود را داخل کادر بکشید." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const signatureDataUrl = canvas.toDataURL("image/png");
      const { data } = await usersApi.saveMySignature(signatureDataUrl);
      setSavedSignature(data.signatureDataUrl);
      clearCanvas();
      setMessage({ type: "success", text: "امضای شما با موفقیت ذخیره شد و از این پس در تأیید فرم‌ها استفاده می‌شود." });
    } catch {
      setMessage({ type: "error", text: "ذخیره امضا ناموفق بود. دوباره تلاش کنید." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PenLine size={17} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">امضای دیجیتال من</h2>
          </div>
          <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
            امضای خود را با موس، قلم یا لمس داخل کادر بکشید. هنگام تأیید فرم، یک نسخه ثابت از همین امضا داخل سابقه تأیید و PDF ذخیره می‌شود.
          </p>
        </div>
        <span className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
          savedSignature ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        )}>
          {loadingSignature ? "در حال بررسی..." : savedSignature ? "امضا ثبت شده" : "امضا ثبت نشده"}
        </span>
      </div>

      {savedSignature && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/60 dark:bg-emerald-500/5">
          <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">امضای فعلی</p>
          <div className="flex min-h-24 items-center justify-center rounded-lg bg-white p-3 dark:bg-white">
            <img src={savedSignature} alt="امضای فعلی" className="max-h-20 max-w-full object-contain" />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white dark:border-gray-700">
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={(e) => drawingRef.current && stopDrawing(e)}
          className="h-56 w-full touch-none cursor-crosshair bg-white"
          aria-label="کادر رسم امضا"
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-400">برای تغییر امضای قبلی، امضای جدید را بکشید و ذخیره کنید.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Eraser size={14} />
            پاک کردن کادر
          </button>
          <button
            type="button"
            onClick={saveSignature}
            disabled={saving || !hasStroke}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            ذخیره امضا
          </button>
        </div>
      </div>

      {message && (
        <div className={cn(
          "mt-3 rounded-xl px-3 py-2 text-xs",
          message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
        )}>
          {message.text}
        </div>
      )}
    </section>
  );
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
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-l from-brand-500 to-indigo-500 dark:bg-zinc-500 dark:bg-none" />

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-500 text-2xl font-bold text-white shadow-lg dark:bg-zinc-700 dark:bg-none">
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

      <SignatureSection />

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
