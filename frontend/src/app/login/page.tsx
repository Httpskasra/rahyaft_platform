// app/login/page.tsx
"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

import { LoginShell } from "@/components/login/LoginShell";
import { LoginCard } from "@/components/login/LoginCard";
import { PhoneStep } from "@/components/login/PhoneStep";
import { OtpStep } from "@/components/login/OtpStep";
import { useOtpLogin } from "@/hooks/login/useOtpLogin";
import { AuroraBackground } from "@/components/login/AuroraBackground";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = "/dashboard/profile";

  const otpLogin = useOtpLogin();

  async function handleVerify() {
    const ok = await otpLogin.verifyOtp();
    if (ok) {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <LoginShell>
      <AuroraBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}>
          <Header step={otpLogin.step} />

          <LoginCard>
            {otpLogin.step === "phone" ?
              <PhoneStep
                phoneRaw={otpLogin.phoneRaw}
                onPhoneChange={otpLogin.setPhoneRaw}
                phoneNormalized={otpLogin.phone}
                error={otpLogin.error}
                loading={otpLogin.loading}
                cooldown={otpLogin.cooldown}
                canSendOtp={otpLogin.canSendOtp}
                onRequestOtp={otpLogin.requestOtp}
              />
            : <OtpStep
                phone={otpLogin.phone}
                otp={otpLogin.otp}
                onOtpChange={otpLogin.setOtp}
                error={otpLogin.error}
                loading={otpLogin.loading}
                cooldown={otpLogin.cooldown}
                canVerify={otpLogin.canVerify}
                onVerify={handleVerify}
                onResend={otpLogin.requestOtp}
                onChangePhone={otpLogin.changePhone}
              />
            }
          </LoginCard>

          {/* <footer className="mt-6 text-center text-xs text-zinc-400">
            middleware مسیر <span className="text-zinc-200">/dashboard</span> رو
            با <span className="text-zinc-200">کوکی httpOnly</span> محافظت
            می‌کنه.
          </footer> */}
        </motion.div>
      </div>
    </LoginShell>
  );
}

function Header({ step }: { step: "phone" | "otp" }) {
  return (
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.65)]" />
        ورود دو مرحله‌ای • OTP
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">
        {" "}
        ورود به پلتفرم رهیافت طب
      </h1>
      <p className="mt-2 text-sm text-zinc-300">
        {step === "phone" ?
          "شماره موبایل رو وارد کن تا کد ۵ رقمی برات ارسال کنیم."
        : "کد ۵ رقمی ارسال شده رو وارد کنید."}
      </p>
    </div>
  );
}
