import type { PurchaseOrderStatus, PurchaseRequestStatus, SupplierLabel } from "@/lib/api/commerce";

export const requestStatusFa: Record<PurchaseRequestStatus,string> = {
  PENDING_APPROVAL:"در انتظار تأیید", APPROVED:"تأییدشده و آماده خرید", REJECTED:"ردشده", ORDERED:"سفارش‌گذاری‌شده", CANCELLED:"لغوشده",
};
export const orderStatusFa: Record<PurchaseOrderStatus,string> = {
  INITIAL:"ثبت اولیه", FOLLOW_UP:"در حال پیگیری", PURCHASED:"خریداری‌شده / منتظر ورود", FINALIZED:"تحویل کامل", CANCELLED:"لغوشده",
};
export const labelFa: Record<SupplierLabel,string> = { WHITE:"سفید", GRAY:"خاکستری", BLACK:"مشکی" };
export const labelClass: Record<SupplierLabel,string> = {
  WHITE:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  GRAY:"bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  BLACK:"bg-zinc-900 text-white dark:bg-black",
};
export const statusClass: Record<string,string> = {
  PENDING_APPROVAL:"bg-amber-50 text-amber-700 dark:bg-amber-950/40", APPROVED:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40",
  REJECTED:"bg-rose-50 text-rose-700 dark:bg-rose-950/40", ORDERED:"bg-blue-50 text-blue-700 dark:bg-blue-950/40", CANCELLED:"bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
  INITIAL:"bg-sky-50 text-sky-700 dark:bg-sky-950/40", FOLLOW_UP:"bg-violet-50 text-violet-700 dark:bg-violet-950/40",
  PURCHASED:"bg-orange-50 text-orange-700 dark:bg-orange-950/40", FINALIZED:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40",
};
export const money = (value?:number|null) => value === null || value === undefined ? "—" : `${Number(value).toLocaleString("fa-IR")} ریال`;
export const faDate = (value?:string|null) => value ? new Date(value).toLocaleDateString("fa-IR") : "—";
export const errorMessage = (error: unknown, fallback="عملیات ناموفق بود") => {
  const e = error as {response?:{data?:{message?:string|string[]}}}; const message=e?.response?.data?.message;
  return Array.isArray(message) ? message.join("، ") : message || fallback;
};
