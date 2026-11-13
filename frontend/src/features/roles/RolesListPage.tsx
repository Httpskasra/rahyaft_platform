/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Search, ShieldCheck } from "lucide-react";
import { rolesApi } from "@/lib/api/roles";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import type { Role } from "./components";

export default function RolesListPage() {
  const { toasts, show } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const response = await rolesApi.findAll(); setRoles(response.data as Role[]); } catch { setError("خطا در دریافت نقش‌ها"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { const query = search.trim().toLocaleLowerCase("fa"); return query ? roles.filter((role) => role.name.toLocaleLowerCase("fa").includes(query)) : roles; }, [roles, search]);
  const create = async () => { if (!name.trim()) return; setCreating(true); try { await rolesApi.create({ name: name.trim() }); setName(""); setOpen(false); show("success", "نقش جدید ایجاد شد"); await load(); } catch { show("error", "ایجاد نقش ناموفق بود"); } finally { setCreating(false); } };

  return <div dir="rtl" lang="fa">
    <ToastViewport toasts={toasts} />
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-bold text-gray-900 dark:text-white">نقش‌ها و دسترسی‌ها</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">نقش‌ها را مشاهده کنید و برای مدیریت مجوزها وارد صفحه جزئیات شوید.</p></div><button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"><Plus size={16} /> نقش جدید</button></div>
    <div className="relative mb-4 max-w-lg"><Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در نقش‌ها..." className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900" /></div>
    {loading ? <div className="flex justify-center py-20"><Spinner /></div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></div> : <DataTable rows={filtered} getRowKey={(role) => role.id} getRowHref={(role) => `/dashboard/roles/${role.id}`} emptyMessage="نقشی پیدا نشد" columns={[
      { key: "name", header: "نام نقش", cell: (role) => <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><ShieldCheck size={17} /></span><span className="font-semibold text-gray-900 dark:text-white">{role.name}</span></div> },
      { key: "permissions", header: "تعداد دسترسی‌ها", cell: (role) => `${(role.permissions ?? []).length.toLocaleString("fa-IR")} دسترسی` },
      { key: "resources", header: "حوزه‌های فعال", cell: (role) => `${new Set((role.permissions ?? []).map((permission) => permission.permission.resource)).size.toLocaleString("fa-IR")} بخش` },
      { key: "type", header: "نوع", cell: (role) => role.name.toLowerCase() === "superadmin" ? <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">سیستمی</span> : <span className="text-gray-500">سفارشی</span> },
    ]} />}
    <Modal open={open} onClose={() => setOpen(false)} title="ایجاد نقش جدید" subtitle="پس از ایجاد، دسترسی‌ها را در صفحه جزئیات تنظیم کنید"><div className="space-y-4"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void create()} placeholder="نام نقش" className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800" /><div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700">انصراف</button><button disabled={!name.trim() || creating} onClick={() => void create()} className="rounded-xl bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50">{creating ? "در حال ایجاد..." : "ایجاد نقش"}</button></div></div></Modal>
  </div>;
}
