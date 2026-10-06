import type { RecruitmentFormType } from "@/lib/api/recruitment";
import type { SharedFormSchema } from "@/components/forms/schema";

export const emptySchema: SharedFormSchema = {
  title: "فرم جدید",
  description: "",
  sections: [{ title: "اطلاعات", fields: [] }],
};

export const typeLabels: Record<RecruitmentFormType, string> = {
  PRE_INTERVIEW: "فرم پیش از مصاحبه",
  INITIAL_INTERVIEW: "ارزیابی مصاحبه اولیه",
  TECHNICAL_INTERVIEW: "ارزیابی مصاحبه فنی",
  SUPERADMIN_REVIEW: "بررسی نهایی",
  PROFILE_COMPLETION: "تکمیل پروفایل",
};

export const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900";

export const button =
  "rounded-xl px-4 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
