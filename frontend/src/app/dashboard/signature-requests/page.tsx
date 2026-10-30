"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PenLine, RefreshCw, XCircle } from "lucide-react";
import { usersApi } from "@/lib/api/users";

type SignatureRequest = Awaited<ReturnType<typeof usersApi.getPendingSignatureChangeRequests>>["data"][number];

export default function SignatureRequestsPage() {
  const [items, setItems] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await usersApi.getPendingSignatureChangeRequests();
      setItems(data);
    } catch {
      setMessage("دریافت درخواست‌های تغییر امضا ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const review = async (id: string, approved: boolean) => {
    setActionId(id);
    setMessage(null);
    try {
      const comment = comments[id]?.trim() || undefined;
      if (approved) await usersApi.approveSignatureChange(id, comment);
      else await usersApi.rejectSignatureChange(id, comment);
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage(approved ? "امضای جدید تأیید و فعال شد." : "درخواست تغییر امضا رد شد.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "ثبت تصمیم ناموفق بود.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PenLine className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">تأیید تغییر امضا</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">درخواست تغییر نمونه امضای افرادی که مدیر مستقیم آن‌ها هستید.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          بروزرسانی
        </button>
      </div>

      {message && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">{message}</div>}

      {loading ? (
        <div className="flex min-h-52 items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">درخواست تغییر امضای منتظر بررسی وجود ندارد.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <section key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-zinc-900 dark:text-white">{item.requester.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{item.requester.department.name}{item.requester.employeeCode ? ` • کد پرسنلی ${item.requester.employeeCode}` : ""}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">در انتظار تأیید</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="mb-2 text-xs font-medium text-zinc-500">امضای فعلی</p>
                  <div className="flex min-h-36 items-center justify-center rounded-lg bg-white p-3">
                    {item.currentSignatureDataUrl ? <img src={item.currentSignatureDataUrl} alt="امضای فعلی" className="max-h-28 max-w-full object-contain" /> : <span className="text-xs text-zinc-400">امضای فعلی موجود نیست</span>}
                  </div>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                  <p className="mb-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">امضای جدید درخواستی</p>
                  <div className="flex min-h-36 items-center justify-center rounded-lg bg-white p-3">
                    <img src={item.requestedSignatureDataUrl} alt="امضای جدید" className="max-h-28 max-w-full object-contain" />
                  </div>
                </div>
              </div>

              <textarea
                value={comments[item.id] ?? ""}
                onChange={(e) => setComments((current) => ({ ...current, [item.id]: e.target.value }))}
                placeholder="توضیح مدیر (اختیاری)"
                maxLength={500}
                className="mt-4 min-h-20 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900"
              />

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button onClick={() => void review(item.id, false)} disabled={actionId === item.id} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:hover:bg-rose-500/10">
                  {actionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  رد درخواست
                </button>
                <button onClick={() => void review(item.id, true)} disabled={actionId === item.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {actionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  تأیید و فعال‌سازی
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
