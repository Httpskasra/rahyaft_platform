"use client";
import { use, useEffect, useState } from "react";
import { SharedFormRenderer } from "@/components/forms/SharedFormRenderer";
import type {
  SharedFormAnswers,
  SharedFormSchema,
} from "@/components/forms/schema";
import { recruitmentApi } from "@/lib/api/recruitment";

type RecruitmentSubmission = {
  id: string;
  stage: string;
  answers: SharedFormAnswers;
  createdAt: string;
  formVersion: {
    version: number;
    schema: SharedFormSchema;
    template: { name: string };
  };
};

export default function Case({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [a, setA] = useState<any>();
  const load = () => recruitmentApi.application(id).then(setA);
  useEffect(() => {
    load();
  }, [id]);
  if (!a) return <p>در حال بارگذاری...</p>;
  const action = async (name: string, data: any = {}) => {
    await recruitmentApi.action(id, name, data);
    await load();
  };
  return (
    <div dir="rtl" className="space-y-5">
      <div className="rounded-2xl border bg-white p-6 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">{a.applicant.fullName}</h1>
        <p>
          {a.jobOpening.title} — {a.trackingCode}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          مرحله جاری: {a.currentStage}
        </p>
      </div>
      <div className="rounded-2xl border bg-white p-6 dark:bg-gray-900">
        <div className="mb-5">
          <h2 className="font-bold">فرم‌های تکمیل‌شده</h2>
          <p className="mt-1 text-sm text-gray-500">
            پاسخ‌های ثبت‌شده متقاضی و ارزیابی‌های مراحل قبلی فقط برای بررسی
            نمایش داده می‌شوند.
          </p>
        </div>
        {a.submissions?.length ? (
          <div className="space-y-6">
            {a.submissions.map((submission: RecruitmentSubmission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div>
                    <h3 className="font-semibold">
                      {submission.formVersion.template.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      مرحله: {submission.stage} · نسخه {submission.formVersion.version}
                    </p>
                  </div>
                  <time className="text-xs text-gray-500">
                    {new Date(submission.createdAt).toLocaleString("fa-IR")}
                  </time>
                </div>
                <SharedFormRenderer
                  schema={submission.formVersion.schema}
                  value={submission.answers}
                  onChange={() => undefined}
                  disabled
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800/50">
            هنوز فرمی برای این پرونده ثبت نشده است.
          </p>
        )}
      </div>
      <div className="rounded-2xl border bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 font-bold">عملیات مرحله</h2>
        <div className="flex flex-wrap gap-3">
          {a.currentStage === "INITIAL_REVIEW" && (
            <>
              <button
                onClick={() => action("approve-initial")}
                className="rounded-lg bg-green-600 px-4 py-2 text-white">
                تأیید اولیه
              </button>
              <button
                onClick={() =>
                  action("reject-initial", {
                    comment: "رد در بررسی اولیه",
                    publicMessage: "درخواست شما در این مرحله پذیرفته نشد.",
                  })
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-white">
                رد درخواست
              </button>
            </>
          )}
          {a.currentStage === "SUPERADMIN_APPROVAL" && (
            <button
              onClick={() => {
                const departmentId = prompt("شناسه دپارتمان");
                if (departmentId) action("final-approve", { departmentId });
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
              تأیید نهایی و ساخت کاربر
            </button>
          )}
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-4 font-bold">تاریخچه</h2>
        <ol className="space-y-3">
          {a.transitions.map((t: any) => (
            <li key={t.id} className="border-r-2 pr-4">
              <b>{t.action}</b>
              <small className="block text-gray-500">
                {new Date(t.createdAt).toLocaleString("fa-IR")}
              </small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
