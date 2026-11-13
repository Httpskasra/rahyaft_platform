/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Search, UserPlus } from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { Spinner } from "@/components/ui/Spinner";
import { DataTable } from "@/components/ui/DataTable";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import { CreateUserModal, type Department, type Role } from "@/features/users/components";

export default function UsersPage() {
  const { toasts, show: showToast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, depsRes, rolesRes] = await Promise.all([usersApi.findAll(), departmentsApi.findAll(), rolesApi.findAll()]);
      setUsers(usersRes.data);
      setDepartments(depsRes.data as Department[]);
      setRoles((rolesRes.data as Role[]).map(({ id, name }) => ({ id, name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات کاربران");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");
    if (!query) return users;
    return users.filter((user) => [user.name, user.phoneNumber, user.employeeCode ?? ""].some((value) => value.toLocaleLowerCase("fa").includes(query)));
  }, [search, users]);
  const departmentName = (id: string) => departments.find((item) => item.id === id)?.name ?? "—";

  return <div dir="rtl" lang="fa" className="min-h-screen">
    <ToastViewport toasts={toasts} />
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">مدیریت کاربران</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">فهرست کاربران سازمان؛ برای مشاهده یا ویرایش، یک ردیف را انتخاب کنید.</p></div>
      <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"><UserPlus size={16} /> کاربر جدید</button>
    </div>
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="relative w-full max-w-lg"><Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو با نام، شماره تماس یا کد پرسنلی..." className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white" /></div>
      {!loading && <span className="shrink-0 text-xs text-gray-500">{filtered.length.toLocaleString("fa-IR")} کاربر</span>}
    </div>
    {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
    : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div><button onClick={fetchData} className="mt-3 underline">تلاش مجدد</button></div>
    : <DataTable rows={filtered} getRowKey={(user) => user.id} getRowHref={(user) => `/dashboard/users/${user.id}`} emptyMessage={search ? "کاربری با این مشخصات پیدا نشد" : "هنوز کاربری ثبت نشده است"} columns={[
      { key: "name", header: "نام کاربر", cell: (user) => <div><p className="font-semibold text-gray-900 dark:text-white">{user.name}</p><p className="mt-1 text-xs text-gray-500" dir="ltr">{user.phoneNumber}</p></div> },
      { key: "department", header: "دپارتمان", cell: (user) => departmentName(user.departmentId) },
      { key: "code", header: "کد پرسنلی", cell: (user) => <span dir="ltr">{user.employeeCode || "—"}</span> },
      { key: "roles", header: "نقش‌ها", cell: (user) => user.roles.length ? <div className="flex flex-wrap gap-1">{user.roles.slice(0, 2).map(({ role }) => <span key={role.id} className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{role.name}</span>)}{user.roles.length > 2 && <span className="text-xs text-gray-500">+{user.roles.length - 2}</span>}</div> : "—" },
      { key: "created", header: "تاریخ ایجاد", cell: (user) => new Intl.DateTimeFormat("fa-IR").format(new Date(user.createdAt)) },
    ]} />}
    <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} departments={departments} roles={roles} onCreate={fetchData} showToast={showToast} />
  </div>;
}
