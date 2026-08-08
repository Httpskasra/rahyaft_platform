/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Search, Trash2, UserPlus } from "lucide-react";
import { usersApi, type UserData } from "@/lib/api/users";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { Spinner } from "@/components/ui/Spinner";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";

// ─── Types ────────────────────────────────────────────────────
import {
  CreateUserModal,
  DeleteUserModal,
  EmptyState,
  NoSelection,
  UserCard,
  UserDetail,
  type Department,
  type Role,
} from "@/features/users/components";

export default function UsersPage() {
  const { toasts, show: showToast } = useToast();

  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeUser = useMemo(
    () => users.find((u) => u.id === activeId) ?? null,
    [users, activeId],
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.phoneNumber.includes(q),
    );
  }, [users, search]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, depsRes, rolesRes] = await Promise.all([
        usersApi.findAll(),
        departmentsApi.findAll(),
        rolesApi.findAll(),
      ]);
      setUsers(usersRes.data);
      setDepartments(depsRes.data as Department[]);
      // rolesApi.findAll ممکن است کل آبجکت نقش را برگرداند، فقط id و name را نگه می‌داریم
      setRoles(
        (rolesRes.data as any[]).map((r: any) => ({ id: r.id, name: r.name })),
      );
      if (usersRes.data.length > 0 && !activeId) {
        setActiveId(usersRes.data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserDeleted = () => {
    fetchData();
    if (activeUser && !users.find((u) => u.id === activeUser.id)) {
      setActiveId(null);
    }
  };

  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastViewport toasts={toasts} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مدیریت کاربران
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            کاربران سازمان را مشاهده، ایجاد، ویرایش و مدیریت کنید
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors">
          <UserPlus size={15} />
          کاربر جدید
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در کاربران..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          {loading ?
            <div className="flex items-center justify-center py-12">
              <Spinner size={22} />
            </div>
          : error ?
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />
                {error}
              </div>
              <button
                onClick={fetchData}
                className="mt-2 text-xs text-red-600 underline dark:text-red-400">
                تلاش مجدد
              </button>
            </div>
          : users.length === 0 ?
            <EmptyState onAdd={() => setCreateOpen(true)} />
          : <div className="flex flex-col gap-2">
              {filtered.length === 0 ?
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  کاربری پیدا نشد
                </p>
              : filtered.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    active={user.id === activeId}
                    onClick={() => setActiveId(user.id)}
                  />
                ))
              }
            </div>
          }
        </aside>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeUser ?
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <NoSelection />
            </div>
          : <UserDetail
              key={activeUser.id}
              user={activeUser}
              departments={departments}
              availableRoles={roles}
              onRefresh={fetchData}
              showToast={showToast}
            />
          }
        </div>
      </div>

      {activeUser && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors">
            <Trash2 size={14} />
            حذف این کاربر
          </button>
        </div>
      )}

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        departments={departments}
        onCreate={fetchData}
        showToast={showToast}
        roles={roles}
      />

      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        user={activeUser}
        onDelete={handleUserDeleted}
        showToast={showToast}
      />
    </div>
  );
}
