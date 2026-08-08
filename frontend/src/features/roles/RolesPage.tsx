/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Pencil, Plus, Search, ShieldCheck, Trash2, Users,
} from "lucide-react";
import { rolesApi } from "@/lib/api/roles";
import { authApi } from "@/lib/api/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
import {
  EmptyState,
  NoSelection,
  PermissionEditor,
  RoleCard,
  countPermissions,
  getPermissionKey,
  type PermMatrix,
  type Role,
} from "@/features/roles/components";

export default function RolesPermissionsPage() {
  const { toasts, show: showToast } = useToast();

  // ── Meta (از /me) ──
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // ── Data ──
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Selection ──
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeId) ?? null,
    [roles, activeId]
  );

  // ── Search ──
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, search]);

  // ── Modals ──
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Form state ──
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── بارگذاری resources و actions از /me ──
  useEffect(() => {
    async function loadMeta() {
      setMetaLoading(true);
      try {
        const { data } = await authApi.me();
        const allPerms = data.roles.flatMap((r) => r.permissions);
        const resources = [...new Set(allPerms.map((p) => p.resource))];
        const actions = [...new Set(allPerms.map((p) => p.action))];
        setAvailableResources(resources);
        setAvailableActions(actions);
      } catch {
        // fallback
        setAvailableResources(["users", "roles", "departments"]);
        setAvailableActions(["create", "read", "update", "delete"]);
      } finally {
        setMetaLoading(false);
      }
    }
    loadMeta();
  }, []);

  // ── Fetch all roles ──
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data } = await rolesApi.findAll();
      setRoles(data);
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as any)?.response?.data?.message ?? "خطا در دریافت نقش‌ها";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create ──
  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data } = await rolesApi.create({ name });
      const safe: Role = { ...data, permissions: data.permissions ?? [] };
      setRoles((prev) => [safe, ...prev]);
      setActiveId(safe.id);
      setCreateOpen(false);
      setNewName("");
      showToast("success", `نقش «${safe.name}» ایجاد شد`);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "خطا در ایجاد نقش");
      showToast("error", msg);
    } finally {
      setCreating(false);
    }
  }

  // ── Rename ──
  async function handleRename() {
    const name = renameDraft.trim();
    if (!name || !activeRole || name === activeRole.name) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await rolesApi.rename(activeRole.id, { name });
      setRoles((prev) =>
        prev.map((r) => (r.id === activeRole.id ? { ...r, name } : r))
      );
      setRenameOpen(false);
      showToast("success", `نام نقش به «${name}» تغییر یافت`);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "خطا در تغییر نام نقش");
      showToast("error", msg);
    } finally {
      setRenaming(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!activeRole) return;
    setDeleting(true);
    try {
      await rolesApi.remove(activeRole.id);
      const remaining = roles.filter((r) => r.id !== activeRole.id);
      setRoles(remaining);
      setActiveId(remaining[0]?.id ?? null);
      setDeleteOpen(false);
      showToast("success", `نقش «${activeRole.name}» حذف شد`);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "خطا در حذف نقش");
      showToast("error", msg);
    } finally {
      setDeleting(false);
    }
  }

  // ── Save permissions ──
  async function handleSavePermissions(matrix: PermMatrix) {
    if (!activeRole) return;
    setSaving(true);
    try {
      const tasks = [];
      for (const res of availableResources) {
        for (const act of availableActions) {
          const key = getPermissionKey(act, res);
          const state = matrix[key];
          if (state?.enabled) {
            tasks.push(
              rolesApi.addPermission(activeRole.id, {
                action: act,
                resource: res,
                scope: state.scope,
              })
            );
          }
        }
      }
      await Promise.all(tasks);
      await fetchRoles();
      showToast("success", "دسترسی‌ها ذخیره شدند");
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.message ??
        (e instanceof Error ? e.message : "خطا در ذخیره دسترسی‌ها");
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" lang="fa" className="min-h-screen">
      <ToastViewport toasts={toasts} />

      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            مدیریت نقش‌ها و دسترسی‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            نقش‌ها را تعریف کنید و دسترسی هر نقش را تنظیم نمایید
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewName("");
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <Plus size={15} />
          نقش جدید
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Roles list */}
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نقش‌ها..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={22} />
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />
                {fetchError}
              </div>
              <button
                onClick={fetchRoles}
                className="mt-2 text-xs text-red-600 underline dark:text-red-400"
              >
                تلاش مجدد
              </button>
            </div>
          ) : roles.length === 0 ? (
            <EmptyState onAdd={() => setCreateOpen(true)} />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  نقشی پیدا نشد
                </p>
              ) : (
                filtered.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    active={role.id === activeId}
                    onClick={() => setActiveId(role.id)}
                  />
                ))
              )}
            </div>
          )}
        </aside>

        {/* Editor panel */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeRole ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <NoSelection />
            </div>
          ) : metaLoading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <Spinner size={22} />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Editor header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
                    <ShieldCheck
                      size={17}
                      className="text-brand-600 dark:text-brand-400"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {activeRole.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {countPermissions(activeRole)} دسترسی فعال
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRenameDraft(activeRole.name);
                      setRenameOpen(true);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil size={12} />
                    ویرایش نام
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 size={12} />
                    حذف نقش
                  </button>
                </div>
              </div>

              {/* Permission editor */}
              <div className="p-6">
                <PermissionEditor
                  role={activeRole}
                  onSave={handleSavePermissions}
                  saving={saving}
                  resources={availableResources}
                  actions={availableActions}
                />
              </div>

              {/* Assign note */}
              <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80">
                  <Users size={15} className="text-gray-400" />
                  اختصاص این نقش به کاربر
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  برای اختصاص نقش به کاربران، به بخش مدیریت کاربران بروید و
                  از آنجا نقش اختصاص دهید.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد نقش جدید"
        subtitle="یک نام واضح و توصیفی برای نقش انتخاب کنید"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              نام نقش
            </label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="مثلاً: مدیر محتوا"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={!newName.trim() || creating}
              onClick={handleCreate}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
                newName.trim() && !creating
                  ? "bg-brand-500 hover:bg-brand-600"
                  : "cursor-not-allowed bg-brand-300 dark:bg-brand-800"
              )}
            >
              {creating && <Spinner size={13} />}
              ایجاد نقش
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="ویرایش نام نقش"
        subtitle="فقط نام نقش تغییر می‌کند، دسترسی‌ها حفظ می‌شوند"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              نام جدید
            </label>
            <input
              autoFocus
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={!renameDraft.trim() || renaming}
              onClick={handleRename}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
                renameDraft.trim() && !renaming
                  ? "bg-brand-500 hover:bg-brand-600"
                  : "cursor-not-allowed bg-brand-300 dark:bg-brand-800"
              )}
            >
              {renaming && <Spinner size={13} />}
              ذخیره
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="حذف نقش"
        subtitle="این عمل برگشت‌پذیر نیست"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
            <div className="flex items-center gap-2.5">
              <AlertCircle
                size={16}
                className="shrink-0 text-red-600 dark:text-red-400"
              />
              <p className="text-sm text-red-700 dark:text-red-300">
                آیا مطمئن هستید که می‌خواهید نقش{" "}
                <strong>«{activeRole?.name}»</strong> را حذف کنید؟ این عمل
                دسترسی تمام کاربران دارای این نقش را لغو می‌کند.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleting && <Spinner size={13} />}
              حذف نقش
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
