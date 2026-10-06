"use client";
import Link from "next/link";
import { ClipboardCheck, FileSearch, FolderCog, History, ArrowLeft } from "lucide-react";

const items = [
  { href: "/dashboard/forms/fill", title: "جستجو و تکمیل فرم", desc: "فرم موردنظر را سریع پیدا کنید و پاسخ جدید ثبت کنید.", icon: FileSearch, tone: "blue" },
  { href: "/dashboard/forms/my-submissions", title: "پاسخ‌های من", desc: "فرم‌های ارسال‌شده و سوابق پاسخ‌های خود را مشاهده کنید.", icon: History, tone: "emerald" },
  { href: "/dashboard/approvals", title: "کارتابل تأیید", desc: "درخواست‌های منتظر بررسی، تأیید یا رد را مدیریت کنید.", icon: ClipboardCheck, tone: "amber" },
  { href: "/dashboard/forms/manage", title: "مدیریت فرم‌ها", desc: "فرم‌ها را بسازید، ویرایش کنید و تحلیل و تنظیمات آن‌ها را ببینید.", icon: FolderCog, tone: "violet" },
] as const;
const tones: Record<string,string> = { blue:"bg-blue-50 text-blue-600 dark:bg-blue-500/10", emerald:"bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10", amber:"bg-amber-50 text-amber-600 dark:bg-amber-500/10", violet:"bg-violet-50 text-violet-600 dark:bg-violet-500/10" };
export default function FormCenterPage(){return <div dir="rtl" className="space-y-6">
  <div><p className="text-xs font-semibold text-blue-600 mb-2">مرکز فرم‌ها</p><h1 className="text-2xl font-bold text-gray-900 dark:text-white">فرم‌ها و گردش کار</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">هر کاری که با فرم‌ها دارید از بخش مخصوص خودش انجام دهید.</p></div>
  <div className="grid gap-4 md:grid-cols-2">{items.map(({href,title,desc,icon:Icon,tone})=><Link key={href} href={href} className="group rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start gap-4"><div className={`rounded-2xl p-3 ${tones[tone]}`}><Icon size={22}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-gray-900 dark:text-white">{title}</h2><ArrowLeft size={17} className="text-gray-300 transition group-hover:-translate-x-1 group-hover:text-blue-500"/></div><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{desc}</p></div></div>
  </Link>)}</div>
</div>}
