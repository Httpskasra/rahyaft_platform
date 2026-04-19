"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/login/cn";


export function OtpStep(props: {
  phone: string;
  otp: string;
  onOtpChange: (v: string) => void;
  error: string | null;
  loading: boolean;
  cooldown: number;
  canVerify: boolean;
  onVerify: () => void;
  onResend: () => void;
  onChangePhone: () => void;
}) {
  const {
    phone,
    otp,
    onOtpChange,
    error,
    loading,
    cooldown,
    canVerify,
    onVerify,
    onResend,
    onChangePhone,
  } = props;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onVerify();
      }}
      className="space-y-4"
    >
      <div className="text-right">
        <div className="flex items-center justify-between text-xs text-zinc-300">
          <span>
            ارسال شده به:{" "}
            <span className="text-zinc-100" dir="ltr">
              {phone}
            </span>
          </span>

          <button type="button" onClick={onChangePhone} className="hover:text-zinc-100">
            تغییر شماره
          </button>
        </div>
      </div>

      <div className="text-right">
        <label className="mb-1 block text-xs font-medium text-zinc-200">کد 6 رقمی</label>
        <div className="group relative">
          <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500/30 via-emerald-400/20 to-pink-500/25 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />
          <input
            type="text"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => onOtpChange(e.target.value)}
            placeholder="مثلاً 12345"
            className={cn(
              "relative w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-3 text-sm text-zinc-100",
              "outline-none placeholder:text-zinc-500",
              "focus:border-white/20",
              "text-left tracking-[0.35em]"
            )}
          />
        </div>
        {/* <p className="mt-1 text-[11px] text-zinc-500">فقط عدد.</p> */}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 text-right">
          {error}
        </div>
      )}

      <motion.button
        type="submit"
        disabled={!canVerify}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-medium",
          "bg-white text-zinc-950",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        <span className="relative z-10">{loading ? "در حال تأیید..." : "تأیید و ورود"}</span>
      </motion.button>

      <div className="flex items-center justify-between text-xs text-zinc-300">
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || loading}
          className={cn("hover:text-zinc-100", (cooldown > 0 || loading) && "opacity-60 cursor-not-allowed")}
        >
          {cooldown > 0 ? `ارسال مجدد تا ${cooldown} ثانیه` : "ارسال مجدد کد"}
        </button>

        {/* <Link className="hover:text-zinc-100" href="/">
          برگشت به خانه
        </Link> */}
      </div>
    </form>
  );
}
