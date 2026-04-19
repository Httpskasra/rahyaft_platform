"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/login/cn";

export function PhoneStep(props: {
  phoneRaw: string;
  onPhoneChange: (v: string) => void;
  phoneNormalized: string;
  error: string | null;
  loading: boolean;
  cooldown: number;
  canSendOtp: boolean;
  onRequestOtp: () => void;

}) {
  const {
    phoneRaw,
    onPhoneChange,
    phoneNormalized,
    error,
    loading,
    cooldown,
    canSendOtp,
    onRequestOtp,

  } = props;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRequestOtp();
      }}
      className="space-y-4">
      <div className="text-right">
        <label className="mb-1 block text-xs font-medium text-zinc-200">
          شماره موبایل
        </label>
        <div className="group relative">
          <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500/30 via-emerald-400/20 to-pink-500/25 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />
          <input
            type="tel"
            dir="ltr"
            inputMode="tel"
            value={phoneRaw}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="مثلاً 09123456789"
            className={cn(
              "relative w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm text-zinc-100",
              "outline-none placeholder:text-zinc-500",
              "focus:border-white/20",
              "text-left",
            )}
          />
        </div>

        <p className="mt-1 text-[11px] text-zinc-500">
          فرمت تشخیص داده شده:{" "}
          <span className="text-zinc-200" dir="ltr">
            {phoneNormalized || "-"}
          </span>
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 text-right">
          {error}
        </div>
      )}

      <motion.button
        type="submit"
        disabled={!canSendOtp}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-medium",
          "bg-white text-zinc-950",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}>
        <span className="relative z-10">
          {cooldown > 0 ?
            `ارسال مجدد تا ${cooldown} ثانیه`
          : loading ?
            "در حال ارسال..."
          : "ارسال کد"}
        </span>
      </motion.button>

      {/* <div className="flex items-center justify-between text-xs text-zinc-300">
        <Link className="hover:text-zinc-100" href="/">
          برگشت به خانه
        </Link>

        <button
          type="button"
          onClick={onResetDemo}
          className="hover:text-zinc-100">
          ریست شماره دمو
        </button>
      </div> */}
    </form>
  );
}
