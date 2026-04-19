"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCooldown } from "./useCooldown";
import { postJSON } from "@/lib/login/api";
import { isValidIranE164, normalizeIranPhone, onlyDigits } from "@/lib/login/phone";

type Step = "phone" | "otp";
type RequestOtpRes = { ok: true };
type VerifyOtpRes = {
  ok: true;
  user: { id: string; name: string; phoneNumber: string };
  accessToken: string;
  refreshToken: string;
};
export function useOtpLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneRaw, setPhoneRaw] = useState("09123456789");
  const [phone, setPhone] = useState("+989123456789");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cooldown, start: startCooldown } = useCooldown();

  useEffect(() => { setPhone(normalizeIranPhone(phoneRaw)); }, [phoneRaw]);

  const canSendOtp = useMemo(
    () => isValidIranE164(phone) && !loading && cooldown <= 0,
    [phone, loading, cooldown]
  );

  // Backend requires exactly 6 digits
  const canVerify = useMemo(
    () => onlyDigits(otp).length === 6 && !loading,
    [otp, loading]
  );

  async function requestOtp() {
    setError(null);
    setLoading(true);
    try {
      await postJSON<RequestOtpRes>("/api/auth/request-otp", { phone });
      setStep("otp");
      setOtp("");
      startCooldown(45);
    } catch (e: any) {
      setError(e?.message ?? "خطایی رخ داد");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const data = await postJSON<VerifyOtpRes>("/api/auth/verify-otp", {
        phone,
        code: onlyDigits(otp),
      });
      // Tokens are in httpOnly cookies (set by the route handler)
      // Store accessToken in localStorage too so apiClient can use it
      // NOTE: If you prefer cookie-only approach, remove these two lines and
      // update apiClient to read from a /api/auth/token endpoint instead.
      localStorage.setItem("accessToken", (data as any).accessToken);
      localStorage.setItem("refreshToken", (data as any).refreshToken);
      // router.replace("/dashboard");
      return true;
    } catch (e: any) {
      setError(e?.message ?? "کد اشتباه است");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function changePhone() {
    setStep("phone");
    setOtp("");
    setError(null);
  }

  return {
    step, phoneRaw, setPhoneRaw, phone, otp,
    setOtp: (v: string) => setOtp(onlyDigits(v).slice(0, 6)), // 6 digits, not 5
    loading, error, cooldown, canSendOtp, canVerify,
    requestOtp, verifyOtp, changePhone,
  };
}