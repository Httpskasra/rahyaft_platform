"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  PenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  ApprovalHistoryItem,
  ApprovalInboxDetail,
  ApprovalInboxItem,
  ApprovalInboxResponse,
  approvalsApi,
} from "@/lib/api/approvals";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "HISTORY";

const statusMeta = {
  PENDING: { label: "در انتظار بررسی", icon: Clock3, cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  APPROVED: { label: "تأیید شده", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  REJECTED: { label: "رد شده", icon: XCircle, cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function printableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (Array.isArray(value)) return value.map(printableValue).join("، ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ApprovalsPage() {
  const [data, setData] = useState<ApprovalInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalInboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await approvalsApi.getInbox();
      setData(response.data);
      setError(null);
    } catch {
      setError("دریافت کارتابل تأیید با خطا مواجه شد.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const openDetail = async (submissionId: string) => {
    setSelectedId(submissionId);
    setDetail(null);
    setComment("");
    setError(null);
    setDetailLoading(true);
    try {
      const response = await approvalsApi.getInboxDetail(submissionId);
      setDetail(response.data);
    } catch {
      setError("جزئیات درخواست قابل دریافت نیست.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setComment("");
    setError(null);
  };

  const submitDecision = async (action: "APPROVED" | "REJECTED") => {
    if (!detail?.canAct || detail.currentStepOrder === null) return;
    if (action === "REJECTED" && !comment.trim()) {
      setError("برای رد کردن فرم، نوشتن دلیل الزامی است.");
      return;
    }
    setActionLoading(action);
    setError(null);
    try {
      await approvalsApi.approveStep(
        detail.submissionId,
        detail.currentStepOrder,
        action,
        comment.trim() || undefined,
      );
      await loadInbox(true);
      const refreshed = await approvalsApi.getInboxDetail(detail.submissionId).catch(() => null);
      if (refreshed) setDetail(refreshed.data);
      else closeDetail();
      setComment("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "ثبت تصمیم با خطا مواجه شد.");
    } finally {
      setActionLoading(null);
    }
  };

  const visibleRows = useMemo(() => {
    if (!data) return [] as Array<ApprovalInboxItem | ApprovalHistoryItem>;
    let rows: Array<ApprovalInboxItem | ApprovalHistoryItem> = [];
    if (tab === "PENDING") rows = data.pending;
    else if (tab === "HISTORY") rows = data.history;
    else rows = data.history.filter((item) => item.action === tab);

    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      const haystack = [
        item.form.name,
        item.form.customId ?? "",
        item.submitter?.name ?? "",
        item.submitter?.phoneNumber ?? "",
        item.submissionId,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, tab, query]);

  const tabs = [
    { id: "PENDING" as Tab, label: "نیازمند بررسی", count: data?.stats.pending ?? 0 },
    { id: "APPROVED" as Tab, label: "تأییدهای من", count: data?.stats.approved ?? 0 },
    { id: "REJECTED" as Tab, label: "ردهای من", count: data?.stats.rejected ?? 0 },
    { id: "HISTORY" as Tab, label: "تاریخچه", count: data?.stats.processed ?? 0 },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <ShieldCheck size={14} /> کارتابل تصمیم‌گیری
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">کارتابل تأیید فرم‌ها</h1>
          <p className="mt-1 text-sm text-gray-500">درخواست‌های مربوط به نقش شما را بررسی کنید، تصمیم بگیرید و تاریخچه گردش را ببینید.</p>
        </div>
        <button
          onClick={() => loadInbox(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> تازه‌سازی
        </button>
      </div>

      {!loading && data && !data.signatureConfigured && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="flex gap-3">
            <PenLine className="mt-0.5 shrink-0" size={19} />
            <div>
              <div className="font-bold">امضای شما هنوز تعریف نشده است</div>
              <div className="mt-1 text-xs opacity-80">برای تأیید یا رد فرم باید ابتدا امضای خود را در پروفایل رسم و ذخیره کنید.</div>
            </div>
          </div>
          <Link href="/dashboard/profile" className="rounded-xl bg-amber-900 px-3 py-2 text-center text-xs font-bold text-white dark:bg-amber-200 dark:text-amber-950">رفتن به پروفایل</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-2xl border bg-white p-4 text-right transition dark:bg-gray-900 ${tab === item.id ? "border-blue-400 ring-4 ring-blue-500/10" : "border-gray-100 hover:border-gray-200 dark:border-gray-800"}`}
          >
            <div className="text-2xl font-black text-gray-900 dark:text-white">{item.count}</div>
            <div className="mt-1 text-xs text-gray-500">{item.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو با نام فرم، کد، شخص یا شناسه درخواست..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pr-11 pl-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-gray-700 dark:bg-gray-950"
            />
          </div>
          <div className="text-xs text-gray-400">{visibleRows.length} مورد</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : error && !data ? (
          <div className="py-16 text-center text-sm text-rose-600">{error}</div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
            <FileCheck2 className="mx-auto mb-3 text-gray-300" size={34} />
            <div className="font-bold text-gray-700 dark:text-gray-200">درخواستی پیدا نشد</div>
            <div className="mt-1 text-xs text-gray-400">برای این فیلتر در حال حاضر موردی وجود ندارد.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRows.map((row) => {
              const isPending = "currentStepOrder" in row;
              const status = isPending ? "PENDING" : row.action;
              const meta = statusMeta[status];
              const Icon = meta.icon;
              return (
                <button
                  key={`${row.submissionId}-${"id" in row ? row.id : "row"}`}
                  onClick={() => openDetail(row.submissionId)}
                  className="group w-full rounded-2xl border border-gray-100 p-4 text-right transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-800 dark:hover:border-blue-900/60 dark:hover:bg-blue-500/5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"><FileText size={19} /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold text-gray-900 dark:text-white">{row.form.name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}><Icon size={12} />{meta.label}</span>
                          {row.form.customId && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-500 dark:bg-gray-800">#{row.form.customId}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span className="inline-flex items-center gap-1"><UserRound size={12} />{row.submitter?.name || "کاربر ناشناس"}</span>
                          <span>{formatDate(row.submissionCreatedAt)}</span>
                          {isPending && row.currentStepOrder && <span>مرحله {row.currentStepOrder} از {row.totalSteps}</span>}
                          {!isPending && <span>مرحله {row.step.stepOrder} • {row.step.role.name}</span>}
                        </div>
                        {!isPending && row.comments && <div className="mt-2 line-clamp-1 text-xs text-gray-500">توضیح: {row.comments}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 opacity-80 transition group-hover:opacity-100">مشاهده و بررسی <ChevronLeft size={15} /></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && closeDetail()}>
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 shadow-2xl dark:bg-gray-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
              <div>
                <div className="text-xs text-gray-400">بررسی درخواست</div>
                <div className="mt-1 font-black text-gray-900 dark:text-white">{detail?.form.name || "جزئیات فرم"}</div>
              </div>
              <button onClick={closeDetail} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={19} /></button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-32"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : detail ? (
              <div className="space-y-5 p-5 pb-36">
                <section className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{detail.form.name}</h2>
                        {detail.form.customId && <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800">#{detail.form.customId}</span>}
                      </div>
                      {detail.form.description && <p className="mt-2 text-sm leading-6 text-gray-500">{detail.form.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>ارسال‌کننده: {detail.submission.user?.name || "نامشخص"}</span>
                        <span>{formatDate(detail.submission.createdAt)}</span>
                        <span>نسخه {detail.submission.formVersion}</span>
                      </div>
                    </div>
                    <span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${statusMeta[detail.status].cls}`}>{statusMeta[detail.status].label}</span>
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center gap-2 font-black"><History size={18} /> گردش تأیید</div>
                  <div className="space-y-0">
                    {detail.steps.map((step, index) => {
                      const action = detail.actions.find((item) => item.step?.stepOrder === step.stepOrder);
                      const isCurrent = detail.status === "PENDING" && detail.currentStepOrder === step.stepOrder;
                      return (
                        <div key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                          {index < detail.steps.length - 1 && <div className="absolute right-[15px] top-8 h-[calc(100%-16px)] w-px bg-gray-200 dark:bg-gray-700" />}
                          <div className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black ${action?.action === "APPROVED" ? "border-emerald-500 bg-emerald-50 text-emerald-600" : action?.action === "REJECTED" ? "border-rose-500 bg-rose-50 text-rose-600" : isCurrent ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"}`}>{action?.action === "APPROVED" ? <Check size={14} /> : action?.action === "REJECTED" ? <X size={14} /> : step.stepOrder}</div>
                          <div className="min-w-0 flex-1 pt-1">
                            <div className="flex flex-wrap items-center gap-2"><span className="font-bold">مرحله {step.stepOrder}</span><span className="text-xs text-gray-500">{step.role.name}</span>{isCurrent && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-500/10">مرحله جاری</span>}</div>
                            {action ? <div className="mt-2 rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/70"><div className="font-semibold">{action.approver?.name || "تأییدکننده"} • {formatDate(action.createdAt)}</div>{action.comments && <div className="mt-1 text-gray-500">{action.comments}</div>}{action.signatureDataUrl && <img src={action.signatureDataUrl} alt="امضای تأییدکننده" className="mt-3 h-12 max-w-40 object-contain object-right" />}</div> : <div className="mt-1 text-xs text-gray-400">هنوز تصمیمی ثبت نشده است.</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-4 flex items-center gap-2 font-black"><FileText size={18} /> اطلاعات ثبت‌شده فرم</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(detail.form.schema?.fields ?? []).map((field) => (
                      <div key={field.id} className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
                        <div className="text-xs font-semibold text-gray-500">{field.label}</div>
                        <div className="mt-2 break-words text-sm font-bold text-gray-900 dark:text-white">{printableValue(detail.submission.data[field.id])}</div>
                      </div>
                    ))}
                    {(detail.form.schema?.fields ?? []).length === 0 && Object.entries(detail.submission.data).map(([key, value]) => (
                      <div key={key} className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60"><div className="text-xs text-gray-500">{key}</div><div className="mt-2 break-words text-sm font-bold">{printableValue(value)}</div></div>
                    ))}
                  </div>
                </section>

                {detail.canAct && (
                  <section className="rounded-3xl border border-blue-100 bg-white p-5 dark:border-blue-900/50 dark:bg-gray-900">
                    <div className="mb-3 flex items-center gap-2 font-black"><MessageSquareText size={18} /> ثبت تصمیم</div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="توضیحات تصمیم را بنویسید... برای رد کردن، درج دلیل الزامی است." className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-950" />
                    {error && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-600"><AlertTriangle size={14} />{error}</div>}
                  </section>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-rose-600">{error || "جزئیات در دسترس نیست."}</div>
            )}

            {detail?.canAct && (
              <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:right-auto lg:w-full lg:max-w-3xl">
                <div className="mx-auto flex max-w-3xl gap-3">
                  <button onClick={() => submitDecision("REJECTED")} disabled={Boolean(actionLoading) || !data?.signatureConfigured} className="flex-1 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/50 dark:hover:bg-rose-500/10">{actionLoading === "REJECTED" ? <Loader2 className="mx-auto animate-spin" size={18} /> : "رد درخواست"}</button>
                  <button onClick={() => submitDecision("APPROVED")} disabled={Boolean(actionLoading) || !data?.signatureConfigured} className="flex-[1.4] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">{actionLoading === "APPROVED" ? <Loader2 className="mx-auto animate-spin" size={18} /> : "تأیید درخواست"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
