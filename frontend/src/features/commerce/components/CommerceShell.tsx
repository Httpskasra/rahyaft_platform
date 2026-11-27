"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardCheck, ClipboardList, PackageSearch, ReceiptText, Scale, Store } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/cn";

export function CommerceShell({children}:{children:React.ReactNode}) {
  const path=usePathname();
  const canProducts=usePermission("read","products"); const canSuppliers=usePermission("read","suppliers");
  const canPricing=usePermission("read","pricing");
  const canReadEvaluations=usePermission("read","supplier-evaluations");
  const canManageTemplates=usePermission("manage-templates","supplier-evaluations");
  const canManageEvaluationSettings=usePermission("manage-settings","supplier-evaluations");
  const canEvaluations=canReadEvaluations || canManageTemplates || canManageEvaluationSettings;
  const tabs=[
    {href:"/dashboard/commerce/requests",label:"درخواست‌های خرید",icon:ClipboardList,show:true},
    {href:"/dashboard/commerce/orders",label:"سفارش‌های خرید",icon:ReceiptText,show:true},
    {href:"/dashboard/commerce/products",label:"کالاها و کدینگ",icon:Boxes,show:canProducts},
    {href:"/dashboard/commerce/suppliers",label:"تأمین‌کنندگان",icon:Store,show:canSuppliers},
    {href:"/dashboard/commerce/pricing",label:"قیمت‌گذاری",icon:Scale,show:canPricing},
    {href:"/dashboard/commerce/evaluations",label:"نظام ارزیابی",icon:ClipboardCheck,show:canEvaluations},
  ];
  return <div dir="rtl" className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
    <div className="overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/10">
      <div className="flex items-center gap-4"><div className="rounded-2xl bg-white/15 p-3"><PackageSearch size={28}/></div><div><h1 className="text-2xl font-black">بازرگانی</h1><p className="mt-1 text-sm text-indigo-100">از درخواست کالا تا تأمین، خرید، ارزیابی و قیمت‌گذاری</p></div></div>
    </div>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      {tabs.filter(t=>t.show).map(t=>{const active=path===t.href||path.startsWith(t.href+"/");const Icon=t.icon;return <Link key={t.href} href={t.href} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",active?"bg-indigo-600 text-white shadow":"text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}><Icon size={17}/>{t.label}</Link>})}
    </nav>
    {children}
  </div>;
}

export function SectionHeader({title,description,action}:{title:string;description?:string;action?:React.ReactNode}) { return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-black text-zinc-900 dark:text-white">{title}</h2>{description&&<p className="mt-1 text-sm text-zinc-500">{description}</p>}</div>{action}</div> }
export const inputClass="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900";
export const buttonPrimary="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
export const buttonSecondary="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
export function EmptyState({text}:{text:string}) { return <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">{text}</div> }
export function AccessDenied() { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center dark:border-amber-900 dark:bg-amber-950/30"><h2 className="font-black text-amber-900 dark:text-amber-100">دسترسی به این بخش مجاز نیست</h2><p className="mt-2 text-sm text-amber-700 dark:text-amber-300">برای مشاهده این صفحه، permission متناظر باید به یکی از نقش‌های شما اختصاص داده شود.</p></div> }
export function Loading() { return <div className="flex justify-center p-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"/></div> }
