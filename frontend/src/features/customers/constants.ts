import type { Customer } from "@/lib/api/customers";

export const statusFa = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  BLACKLISTED: "مسدود",
} as const;
export const typeFa = { PERSON: "حقیقی", ORGANIZATION: "سازمانی" } as const;
export const occupationGroupOptions = [
  ["HAIR_TRANSPLANT_TECHNICIAN", "تکنسین کاشت مو"],
  ["NAIL_TECHNICIAN", "تکنسین کاشت ناخن"],
  ["GENERAL_PRACTITIONER", "پزشک عمومی"],
  ["PHYSICIAN", "پزشک"],
  ["HAIR_BEAUTY_CLINIC", "کلینیک کاشت مو و زیبایی"],
  ["HOME_DEVICE_CUSTOMER", "مشتری دستگاه خانگی"],
  ["BARBER", "آرایشگر"],
  ["DENTIST", "دندانپزشک"],
  ["VETERINARIAN", "دامپزشک"],
  ["COLLEAGUE", "همکار"],
  ["EMPLOYEE", "کارمند"],
  ["DERMATOLOGIST", "متخصص پوست و مو"],
  ["GYNECOLOGIST", "متخصص زنان"],
  ["OTHER", "سایر"],
] as const;
export const oppStatusFa: Record<string, string> = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته‌شده",
  NEEDS_QUOTE: "نیازمند پیش‌فاکتور",
  QUOTED: "پیش‌فاکتور ارسال‌شده",
  NEGOTIATION: "مذاکره",
  WON: "موفق",
  LOST: "از دست رفته",
  CANCELED: "لغو شده",
};
export const activityFa: Record<string, string> = {
  NOTE: "یادداشت",
  CALL: "تماس",
  SMS: "پیامک",
  VISIT: "ملاقات",
  FOLLOW_UP: "پیگیری",
  CUSTOMER_CREATED: "ایجاد مشتری",
  CUSTOMER_UPDATED: "ویرایش مشتری",
  CONTACT_CREATED: "ایجاد مخاطب",
  CONTACT_UPDATED: "ویرایش مخاطب",
  CONTACT_DELETED: "حذف مخاطب",
  SALES_OPPORTUNITY_CREATED: "ایجاد فرصت فروش",
  SALES_OPPORTUNITY_UPDATED: "ویرایش فرصت فروش",
  SALES_OPPORTUNITY_DELETED: "حذف فرصت فروش",
  REPAIR_CREATED: "ایجاد تعمیر",
  REPAIR_STATUS_CHANGED: "تغییر وضعیت تعمیر",
  AI_ANALYSIS_UPDATED: "تحلیل AI",
};
export const nameOf = (c: Customer) =>
  c.type === "ORGANIZATION" ?
    c.organizationName || "سازمان بدون نام"
  : `${c.firstName || ""} ${c.lastName || ""}`.trim();
export const dateFa = (v?: string | null) =>
  v ?
    new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
      new Date(v),
    )
  : "—";
export const money = (v?: string | number | null) =>
  v ? `${Number(v).toLocaleString("fa-IR")} تومان` : "—";
export const card =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
export const input =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800";


