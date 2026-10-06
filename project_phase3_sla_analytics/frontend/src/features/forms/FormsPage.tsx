"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BarChart3, FilePenLine, FileText, Loader2, MoreHorizontal, Plus, Search, Settings2 } from "lucide-react";
import { formsApi, type Form } from "@/lib/api/forms";

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await formsApi.findManaged(); setForms(data); }
    catch { setForms([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => forms.filter(f => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || (f.customId ?? "").toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
    const matchStatus = status === "all" || (status === "active" ? f.isActive : !f.isActive);
    return matchQ && matchStatus;
  }), [forms, query, status]);

  const toggleActive = async (form: Form) => {
    try { await formsApi.update(form.id, { isActive: !form.isActive }); await load(); }
    catch { alert("تغییر وضعیت فرم انجام نشد"); }
  };

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">مدیریت فرم‌ها</h1><p className="mt-1 text-sm text-gray-500">ساخت، طراحی، پاسخ‌ها، تحلیل و گردش تأیید هر فرم در یک فضای مستقل.</p></div>
      <div className="flex gap-2"><Link href="/dashboard/forms/analytics" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><BarChart3 size={16}/> تحلیل کلی</Link><Link href="/dashboard/forms/manage/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16}/> ساخت فرم</Link></div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["کل فرم‌ها", forms.length],
        ["فعال", forms.filter(f => f.isActive).length],
        ["غیرفعال", forms.filter(f => !f.isActive).length],
        ["کل پاسخ‌ها", forms.reduce((s, f) => s + (f._count?.submissions ?? 0), 0)],
      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p></div>)}
    </div>

    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجو بر اساس نام، کد یا توضیحات..." className="w-full rounded-xl border border-gray-200 bg-transparent py-2.5 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700"/></div>
        <div className="flex gap-1 rounded-xl bg-gray-50 p-1 dark:bg-gray-800">{([['all','همه'],['active','فعال'],['inactive','غیرفعال']] as const).map(([k,l]) => <button key={k} onClick={() => setStatus(k)} className={`rounded-lg px-3 py-2 text-xs font-medium ${status===k?'bg-white text-blue-600 shadow-sm dark:bg-gray-900':'text-gray-500'}`}>{l}</button>)}</div>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={30}/></div>
      : filtered.length === 0 ? <div className="py-16 text-center"><FileText className="mx-auto mb-3 text-gray-300" size={40}/><p className="text-sm text-gray-500">فرمی پیدا نشد</p></div>
      : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40"><th className="p-3 text-right font-medium">فرم</th><th className="p-3 text-right font-medium">کد</th><th className="p-3 text-center font-medium">فیلدها</th><th className="p-3 text-center font-medium">پاسخ‌ها</th><th className="p-3 text-center font-medium">نسخه</th><th className="p-3 text-center font-medium">وضعیت</th><th className="p-3 text-center font-medium">آخرین تغییر</th><th className="p-3 text-center font-medium">عملیات</th></tr></thead><tbody>{filtered.map(form => <tr key={form.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800/60 dark:hover:bg-gray-800/30"><td className="p-3"><Link href={`/dashboard/forms/manage/${form.id}`} className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white">{form.name}</Link>{form.description && <p className="mt-1 max-w-[280px] truncate text-xs text-gray-400">{form.description}</p>}</td><td className="p-3 font-mono text-xs text-gray-500" dir="ltr">{form.customId || '—'}</td><td className="p-3 text-center text-gray-600 dark:text-gray-300">{form.schema?.fields?.length ?? 0}</td><td className="p-3 text-center font-semibold text-gray-700 dark:text-gray-200">{form._count?.submissions ?? 0}</td><td className="p-3 text-center text-gray-500">{form.version}</td><td className="p-3 text-center"><button onClick={() => toggleActive(form)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${form.isActive?'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400':'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>{form.isActive?'فعال':'غیرفعال'}</button></td><td className="p-3 text-center text-xs text-gray-400">{new Date(form.updatedAt).toLocaleDateString('fa-IR')}</td><td className="p-3"><div className="flex justify-center gap-1"><Link title="طراحی فرم" href={`/dashboard/forms/manage/${form.id}/builder`} className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><FilePenLine size={15}/></Link><Link title="تحلیل" href={`/dashboard/forms/manage/${form.id}/analytics`} className="rounded-lg p-2 text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-500/10"><BarChart3 size={15}/></Link><Link title="تنظیمات" href={`/dashboard/forms/manage/${form.id}/settings`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"><Settings2 size={15}/></Link><button title={form.isActive?'غیرفعال کردن':'فعال کردن'} onClick={() => toggleActive(form)} className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"><Archive size={15}/></button></div></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
