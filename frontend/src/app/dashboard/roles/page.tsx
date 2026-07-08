/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Pencil,
  Users,
  Lock,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  ShieldOff,
  Globe,
  Building2,
  UserCircle,
  Network,
  Layers,
} from "lucide-react";
import { rolesApi } from "@/lib/api/roles";
import { authApi } from "@/lib/api/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type ScopeType =
  | "SELF"
  | "TEAM"
  | "DEPARTMENT"
  | "DEPARTMENT_SUBTREE"
  | "RELATED_DEPARTMENTS"
  | "ORG_WIDE";

type DepartmentRelationType =
  | "SUPPORTS"
  | "COLLABORATES"
  | "AUDITS"
  | "SERVES";

interface Permission {
  id: string;
  action: string;
  resource: string;
}

interface RolePermission {
  id: string;
  permissionId: string;
  scope: ScopeType;
  relationType: DepartmentRelationType | null;
  constraints: unknown;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  permissions: RolePermission[];
}

type Resource = string;
type Action = string;

// ─────────────────────────────────────────────────────────────
// Labels & Colors
// ─────────────────────────────────────────────────────────────
const RESOURCE_LABELS: Record<string, string> = {
  users: "کاربران",
  roles: "نقش‌ها",
  departments: "دپارتمان‌ها",
  forms: "فرم‌ها",
  "form-submissions": "ثبت فرم‌ها",
  approvals: "تاییدیه‌ها",
  "user-info": "اطلاعات کاربران",
};

const ACTION_LABELS: Record<string, string> = {
  create: "ایجاد",
  read: "مشاهده",
  update: "ویرایش",
  delete: "حذف",
  approve: "تایید",
};

function getResourceLabel(r: string) {
  return RESOURCE_LABELS[r] ?? r;
}

function getActionLabel(a: string) {
  return ACTION_LABELS[a] ?? a;
}

const ACTION_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string; dot: string }
> = {
  create: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  read: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
    dot: "bg-blue-500",
  },
  update: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    darkBg: "dark:bg-amber-500/10",
    darkText: "dark:text-amber-400",
    dot: "bg-amber-500",
  },
  delete: {
    bg: "bg-red-50",
    text: "text-red-700",
    darkBg: "dark:bg-red-500/10",
    darkText: "dark:text-red-400",
    dot: "bg-red-500",
  },
  approve: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    darkBg: "dark:bg-purple-500/10",
    darkText: "dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

const DEFAULT_ACTION_COLOR = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  darkBg: "dark:bg-gray-500/10",
  darkText: "dark:text-gray-400",
  dot: "bg-gray-400",
};

function getActionColor(action: string) {
  return ACTION_COLORS[action] ?? DEFAULT_ACTION_COLOR;
}

const SCOPE_LABELS: Record<ScopeType, string> = {
  SELF: "فقط خود",
  TEAM: "تیم",
  DEPARTMENT: "دپارتمان",
  DEPARTMENT_SUBTREE: "زیردرخت دپارتمان",
  RELATED_DEPARTMENTS: "دپارتمان‌های مرتبط",
  ORG_WIDE: "کل سازمان",
};

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────


function getPermissionKey(action: string, resource: string) {
  return `${action}:${resource}`;
}

function countPermissions(role: Role) {
  return (role.permissions ?? []).length;
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur pointer-events-auto",
            "animate-in fade-in slide-in-from-bottom-3 duration-300",
            t.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          )}
        >
          {t.type === "success" ? (
            <Check size={15} className="shrink-0" />
          ) : (
            <AlertCircle size={15} className="shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}



// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// Permission badge
// ─────────────────────────────────────────────────────────────
function PermBadge({ action }: { action: string }) {
  const c = getActionColor(action);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        c.bg,
        c.text,
        c.darkBg,
        c.darkText
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {getActionLabel(action)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Scope select
// ─────────────────────────────────────────────────────────────
function ScopeSelect({
  value,
  onChange,
}: {
  value: ScopeType;
  onChange: (v: ScopeType) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ScopeType)}
        className="h-9 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
      >
        {(Object.keys(SCOPE_LABELS) as ScopeType[]).map((s) => (
          <option key={s} value={s}>
            {SCOPE_LABELS[s]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <Globe size={13} />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Permission matrix types
// ─────────────────────────────────────────────────────────────
interface PermRowState {
  enabled: boolean;
  scope: ScopeType;
}

type PermMatrix = Record<string, PermRowState>;

function buildMatrix(
  role: Role,
  resources: string[],
  actions: string[]
): PermMatrix {
  const matrix: PermMatrix = {};
  for (const res of resources) {
    for (const act of actions) {
      const key = getPermissionKey(act, res);
      const found = (role.permissions ?? []).find(
        (p) => p.permission.action === act && p.permission.resource === res
      );
      matrix[key] = {
        enabled: !!found,
        scope: found?.scope ?? "DEPARTMENT",
      };
    }
  }
  return matrix;
}

// ─────────────────────────────────────────────────────────────
// Resource section
// ─────────────────────────────────────────────────────────────
function ResourceSection({
  resource,
  actions,
  matrix,
  onChange,
  expandedResource,
  onToggleResource,
}: {
  resource: Resource;
  actions: string[];
  matrix: PermMatrix;
  onChange: (
    key: string,
    field: keyof PermRowState,
    value: boolean | ScopeType
  ) => void;
  expandedResource: Resource | null;
  onToggleResource: (r: Resource) => void;
}) {
  const isOpen = expandedResource === resource;

  const enabledCount = actions.filter(
    (a) => matrix[getPermissionKey(a, resource)]?.enabled
  ).length;

  const someOn = enabledCount > 0;
  const allOn = enabledCount === actions.length;

  function toggleAll() {
    const next = !allOn;
    for (const act of actions) {
      onChange(getPermissionKey(act, resource), "enabled", next);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700/60">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleResource(resource)}
        onKeyDown={(e) => e.key === "Enter" && onToggleResource(resource)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-right transition-colors",
          isOpen
            ? "bg-gray-50 dark:bg-gray-800/60"
            : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              someOn
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            )}
          >
            <ShieldCheck size={14} />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {getResourceLabel(resource)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {enabledCount} از {actions.length} دسترسی فعال
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              allOn
                ? "bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            {allOn ? "حذف همه" : "انتخاب همه"}
          </button>
          <ChevronDown
            size={16}
            className={cn(
              "text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {actions.map((action) => {
            const key = getPermissionKey(action, resource);
            const state = matrix[key];
            return (
              <div
                key={action}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  state?.enabled
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/50 dark:bg-gray-800/20"
                )}
              >
                <button
                  type="button"
                  onClick={() => onChange(key, "enabled", !state?.enabled)}
                  className={cn(
                    "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200",
                    state?.enabled
                      ? "bg-brand-500 dark:bg-brand-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-checked={state?.enabled}
                  role="switch"
                >
                  <span
                    className={cn(
                      "absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-200",
                      state?.enabled ? "right-0.5" : "left-0.5"
                    )}
                  />
                </button>

                <div className="flex flex-1 items-center gap-2">
                  <PermBadge action={action} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {resource}.{action}
                  </span>
                </div>

                {state?.enabled ? (
                  <div className="w-44 shrink-0">
                    <ScopeSelect
                      value={state.scope}
                      onChange={(v) => onChange(key, "scope", v)}
                    />
                  </div>
                ) : (
                  <div className="w-44 shrink-0">
                    <div className="flex h-9 items-center rounded-xl border border-dashed border-gray-200 px-3 dark:border-gray-700">
                      <span className="text-xs text-gray-400">غیر فعال</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Permission Editor panel
// ─────────────────────────────────────────────────────────────
function PermissionEditor({
  role,
  onSave,
  saving,
  resources,
  actions,
}: {
  role: Role;
  onSave: (matrix: PermMatrix) => Promise<void>;
  saving: boolean;
  resources: string[];
  actions: string[];
}) {
  const [matrix, setMatrix] = useState<PermMatrix>(() =>
    buildMatrix(role, resources, actions)
  );
  const [expandedResource, setExpandedResource] = useState<Resource | null>(
    resources[0] ?? null
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setMatrix(buildMatrix(role, resources, actions));
    setDirty(false);
    setExpandedResource(resources[0] ?? null);
  }, [role.id, resources, actions]);

  function handleChange(
    key: string,
    field: keyof PermRowState,
    value: boolean | ScopeType
  ) {
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setDirty(true);
  }

  const enabledTotal = useMemo(
    () => Object.values(matrix).filter((v) => v.enabled).length,
    [matrix]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {enabledTotal} دسترسی فعال
          </span>
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              • ذخیره نشده
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setExpandedResource((prev) =>
              prev === null ? (resources[0] ?? null) : null
            );
          }}
          className="text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
        >
          {expandedResource ? "بستن همه" : "باز کردن همه"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {resources.map((res) => (
          <ResourceSection
            key={res}
            resource={res}
            actions={actions}
            matrix={matrix}
            onChange={handleChange}
            expandedResource={expandedResource}
            onToggleResource={(r) =>
              setExpandedResource((prev) => (prev === r ? null : r))
            }
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave(matrix)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
            dirty && !saving
              ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
          )}
        >
          {saving ? <Spinner size={14} /> : <Check size={14} />}
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role card
// ─────────────────────────────────────────────────────────────
function RoleCard({
  role,
  active,
  onClick,
}: {
  role: Role;
  active: boolean;
  onClick: () => void;
}) {
  const permCount = countPermissions(role);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-right transition-all duration-150",
        active
          ? "border-brand-300 bg-brand-50/70 shadow-sm dark:border-brand-700 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              active
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <ShieldCheck size={15} />
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-gray-800 dark:text-white/90"
              )}
            >
              {role.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {permCount} دسترسی
            </p>
          </div>
        </div>
        <ChevronRight
          size={14}
          className={cn(
            "mt-1 shrink-0 text-gray-400 transition-transform",
            active && "rotate-90 text-brand-500"
          )}
        />
      </div>

      {permCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(role.permissions ?? []).slice(0, 4).map((rp) => (
            <span
              key={rp.id}
              className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {rp.permission.action}.{rp.permission.resource}
            </span>
          ))}
          {permCount > 4 && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              +{permCount - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty / no-selection states
// ─────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <ShieldOff size={24} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">
          هنوز نقشی تعریف نشده
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          اولین نقش را ایجاد کنید
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        <Plus size={14} />
        ایجاد نقش
      </button>
    </div>
  );
}

function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Lock size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        یک نقش را از ستون چپ انتخاب کنید
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
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
      <ToastContainer toasts={toasts} />

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