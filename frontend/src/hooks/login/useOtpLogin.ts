"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCooldown } from "./useCooldown";
import { isValidIranE164, normalizeIranPhone, onlyDigits } from "@/lib/login/phone";
import { authApi } from "@/lib/api/auth";

type Step = "phone" | "otp";

export function useOtpLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneRaw, setPhoneRaw] = useState("09123456789");
  const [phone, setPhone] = useState("+989123456789");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cooldown, start: startCooldown } = useCooldown();

  useEffect(() => {
    setPhone(normalizeIranPhone(phoneRaw));
  }, [phoneRaw]);

  const canSendOtp = useMemo(
    () => isValidIranE164(phone) && !loading && cooldown <= 0,
    [phone, loading, cooldown]
  );

  // بک‌اند دقیقاً ۶ رقم انتظار دارد
  const canVerify = useMemo(
    () => onlyDigits(otp).length === 6 && !loading,
    [otp, loading]
  );

  async function requestOtp() {
    setError(null);
    setLoading(true);
    try {
      // استفاده از authApi به جای fetch
      await authApi.sendOtp(phone);
      setStep("otp");
      setOtp("");
      startCooldown(45);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "خطایی رخ داد";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const code = onlyDigits(otp);
      const { data } = await authApi.verifyOtp(phone, code);
      
      // ذخیره توکن در localStorage تا apiClient در درخواست‌های بعدی استفاده کند
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || "کد اشتباه است";
      setError(message);
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
    step,
    phoneRaw,
    setPhoneRaw,
    phone,
    otp,
    setOtp: (v: string) => setOtp(onlyDigits(v).slice(0, 6)), // حداکثر ۶ رقم
    loading,
    error,
    cooldown,
    canSendOtp,
    canVerify,
    requestOtp,
    verifyOtp,
    changePhone,
  };
}