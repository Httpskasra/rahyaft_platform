"use client";

import {
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { formsApi, type DeepAnalysis } from "@/lib/api/forms";
import {
  ArrowRight,
  Brain,
  Loader2,
  RefreshCw,
  Send,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SchemaField } from "@/features/forms/detail/types";
import { AnalyticsDashboardWithApproval } from "@/features/forms/detail/analytics";
import {
  ApprovalPolicyEditor,
  ApprovalStatusModal,
} from "@/features/forms/detail/approval";
import { SubmitFormPanel } from "@/features/forms/detail/submission";

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5",
        className,
      )}>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

export default function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<DeepAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analytics" | "submit" | "approval">(
    "analytics",
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await formsApi.getDeepAnalysis(id);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );

  if (!data)
    return (
      <div className="text-center py-24 text-gray-500">
        <p>فرم یافت نشد یا خطایی رخ داد</p>
        <Link
          href="/dashboard/forms"
          className="text-blue-600 text-sm mt-2 inline-block hover:underline">
          بازگشت به لیست
        </Link>
      </div>
    );

  const fields = (data.form.schema?.fields ?? []) as SchemaField[];

  return (
    <div className="space-y-6" dir="rtl">
      {selectedSubmissionId && (
        <ApprovalStatusModal
          submissionId={selectedSubmissionId}
          onClose={() => setSelectedSubmissionId(null)}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard/forms"
          className="hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
          <ArrowRight size={14} /> فرم‌ها
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">
          {data.form.name}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {data.form.name}
          </h1>
          {data.form.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {data.form.description}
            </p>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={13} /> بروزرسانی
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 w-fit">
        {(["analytics", "submit", "approval"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t ?
                "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
            )}>
            {t === "analytics" && "📊 تحلیل هوشمند"}
            {t === "submit" && "📝 ارسال پاسخ"}
            {t === "approval" && "⚙️ تنظیمات تأیید"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "analytics" &&
        (data.submissionCount === 0 ?
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
            <Brain
              size={36}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              هنوز پاسخی ثبت نشده
            </p>
            <p className="text-xs text-gray-400 mb-4">
              پس از اولین ارسال، تمام تحلیل‌ها اینجا نمایش داده می‌شوند
            </p>
            <button
              onClick={() => setTab("submit")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Send size={14} /> ارسال اولین پاسخ
            </button>
          </div>
        : <AnalyticsDashboardWithApproval
            data={data}
            onViewApproval={setSelectedSubmissionId}
          />)}
      {tab === "submit" && (
        <SubmitFormPanel
          formId={data.form.id}
          fields={fields}
          onSubmit={load}
        />
      )}
      {tab === "approval" && (
        <Card
          title="خط مشی تأیید فرم"
          icon={<Settings size={16} className="text-purple-500" />}>
          <ApprovalPolicyEditor formId={data.form.id} onPolicyChange={load} />
        </Card>
      )}
    </div>
  );
}

// Wrapper to pass approval handler to AnalyticsDashboard
