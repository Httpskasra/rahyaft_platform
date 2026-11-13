/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { repairsApi, type RepairCase } from "@/lib/api/repairs";
import { usersApi, type UserData } from "@/lib/api/users";
import { DetailPageHeader } from "@/components/ui/DetailPageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import { RepairDetail } from "./components";

export default function RepairDetailPage({ repairId }: { repairId: string }) {
  const { toasts, show } = useToast();
  const [repair, setRepair] = useState<RepairCase | null>(null);
  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [repairRes, usersRes] = await Promise.all([repairsApi.findOne(repairId), usersApi.findAll()]);
      setRepair(repairRes.data); setTechnicians(usersRes.data);
    } catch { setError("پرونده تعمیر موردنظر پیدا نشد یا دسترسی به آن امکان‌پذیر نیست"); }
    finally { setLoading(false); }
  }, [repairId]);
  useEffect(() => { void load(); }, [load]);

  return <div dir="rtl" lang="fa">
    <ToastViewport toasts={toasts} />
    <DetailPageHeader backHref="/dashboard/repairs" backLabel="بازگشت به فهرست تعمیرات" title={repair ? `پرونده ${repair.caseNumber}` : "جزئیات تعمیر"} subtitle={repair?.deviceTitle} />
    {loading ? <div className="flex justify-center py-24"><Spinner size={24} /></div>
    : error || !repair ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></div>
    : <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><RepairDetail key={`${repair.id}-${repair.updatedAt}`} repair={repair} technicians={technicians} showToast={show} onRefresh={load} /></div>}
  </div>;
}
