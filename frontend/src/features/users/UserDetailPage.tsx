/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2 } from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { DetailPageHeader } from "@/components/ui/DetailPageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import { DeleteUserModal, UserDetail, type Department, type Role } from "./components";

export default function UserDetailPage({ userId }: { userId: string }) {
  const router = useRouter();
  const { toasts, show } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [userRes, depsRes, rolesRes] = await Promise.all([usersApi.findOne(userId), departmentsApi.findAll(), rolesApi.findAll()]);
      setUser(userRes.data);
      setDepartments(depsRes.data as Department[]);
      setRoles((rolesRes.data as Role[]).map(({ id, name }) => ({ id, name })));
    } catch { setError("کاربر موردنظر پیدا نشد یا دسترسی به آن امکان‌پذیر نیست"); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return <div dir="rtl" lang="fa">
    <ToastViewport toasts={toasts} />
    <DetailPageHeader backHref="/dashboard/users" backLabel="بازگشت به فهرست کاربران" title={user?.name ?? "جزئیات کاربر"} subtitle={user ? user.phoneNumber : undefined} actions={user && <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><Trash2 size={15} /> حذف کاربر</button>} />
    {loading ? <div className="flex justify-center py-24"><Spinner size={24} /></div>
    : error || !user ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></div>
    : <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><UserDetail key={user.id} user={user} departments={departments} availableRoles={roles} onRefresh={load} showToast={show} /></div>}
    <DeleteUserModal open={deleteOpen} onClose={() => setDeleteOpen(false)} user={user} onDelete={() => router.push("/dashboard/users")} showToast={show} />
  </div>;
}
