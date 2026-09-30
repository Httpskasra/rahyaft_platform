"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { BarChart3, ClipboardList, FilePenLine, FileText, Loader2, Settings2, Workflow } from "lucide-react";
import { formsApi, type Form } from "@/lib/api/forms";
import { FormManagerHeader } from "./FormManagerHeader";

export default function FormOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await formsApi.findById(id); setForm(data); } catch { setForm(null); } finally { setLoading(false); } }, [id]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500" size={30}/></div>;
  if (!form) return <div className="py-20 text-center text-gray-500">فرم یافت نشد.</div>;

  const actions = [
    { href: `/dashboard/forms/manage/${id}/builder`, title: "طراحی فرم", text: "فیلدها، ترتیب و ساختار فرم را ویرایش کنید.", icon: FilePenLine },
    { href: `/dashboard/forms/manage/${id}/submissions`, title: "پاسخ‌ها", text: "پاسخ‌های ثبت‌شده و وضعیت تأیید آن‌ها را ببینید.", icon: ClipboardList },
    { href: `/dashboard/forms/manage/${id}/analytics`, title: "تحلیل", text: "گزارش‌ها، روندها و تحلیل هوشمند پاسخ‌ها.", icon: BarChart3 },
    { href: `/dashboard/forms/manage/${id}/approval`, title: "گردش تأیید", text: "نقش‌ها و ترتیب مراحل تأیید را تنظیم کنید.", icon: Workflow },
    { href: `/dashboard/forms/manage/${id}/settings`, title: "تنظیمات", text: "نام، توضیحات، وضعیت و تنظیمات عمومی فرم.", icon: Settings2 },
    { href: `/dashboard/forms/fill/${id}`, title: "نمایش فرم", text: "فرم را همان‌طور که کاربران می‌بینند باز کنید.", icon: FileText },
  ];

  return <div className="space-y-6" dir="rtl">
    <FormManagerHeader form={form}/>
    {form.description && <div className="rounded-2xl border border-gray-100 bg-white p-5 text-sm leading-7 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">{form.description}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["تعداد فیلد", form.schema?.fields?.length ?? 0],
        ["تعداد پاسخ", form._count?.submissions ?? 0],
        ["نسخه فرم", form.version],
        ["وضعیت", form.isActive ? "فعال" : "غیرفعال"],
      ].map(([l,v]) => <div key={String(l)} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-500">{l}</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{v}</p></div>)}
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{actions.map(({href,title,text,icon:Icon}) => <Link key={href} href={href} className="group rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10"><Icon size={19}/></div><h3 className="font-bold text-gray-900 group-hover:text-blue-600 dark:text-white">{title}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></Link>)}</div>
  </div>;
}
