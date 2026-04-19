"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  FolderOpen,
  Users,
  Link2,
  Link2Off,
  Network,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { departmentsApi, DepartmentRelationType } from "@/lib/api/departments";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DepartmentChild {
  id: string;
  name: string;
}

interface DepartmentRelation {
  id: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  type: DepartmentRelationType;
  toDepartment: { id: string; name: string };
}

interface Department {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  children: DepartmentChild[];
  outgoingRelations: DepartmentRelation[];
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const RELATION_TYPES: DepartmentRelationType[] = [
  "SUPPORTS",
  "COLLABORATES",
  "AUDITS",
  "SERVES",
];

const RELATION_LABELS: Record<DepartmentRelationType, string> = {
  SUPPORTS: "پشتیبانی از",
  COLLABORATES: "همکاری با",
  AUDITS: "حسابرسی",
  SERVES: "خدمت‌رسانی به",
};

const RELATION_COLORS: Record<
  DepartmentRelationType,
  { bg: string; text: string; darkBg: string; darkText: string; dot: string }
> = {
  SUPPORTS: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
    dot: "bg-blue-500",
  },
  COLLABORATES: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  AUDITS: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    darkBg: "dark:bg-amber-500/10",
    darkText: "dark:text-amber-400",
    dot: "bg-amber-500",
  },
  SERVES: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    darkBg: "dark:bg-purple-500/10",
    darkText: "dark:text-purple-400",
    dot: "bg-purple-500",
  },
};

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}
let _toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((type: ToastType, message: string) => {
    const id = ++_toastId;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur pointer-events-auto",
            "animate-in fade-in slide-in-from-bottom-3 duration-300",
            t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          )}
        >
          {t.type === "success" ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
function Modal({
  open, onClose, title, subtitle, children, maxWidth = "max-w-md",
}: {
  open: boolean; onClose: () => void; title: string;
  subtitle?: string; children: React.ReactNode; maxWidth?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div ref={ref} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn("relative w-full rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900", maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-500 dark:text-brand-400" />;
}

// ─────────────────────────────────────────────────────────────
// Relation badge
// ─────────────────────────────────────────────────────────────
function RelationBadge({ type }: { type: DepartmentRelationType }) {
  const c = RELATION_COLORS[type];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", c.bg, c.text, c.darkBg, c.darkText)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {RELATION_LABELS[type]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Department card (sidebar list)
// ─────────────────────────────────────────────────────────────
function DeptCard({
  dept, active, parentName, onClick,
}: {
  dept: Department; active: boolean; parentName?: string; onClick: () => void;
}) {
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
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            active
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          )}>
            <Building2 size={15} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", active ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90")}>
              {dept.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {parentName ? `زیر: ${parentName}` : "دپارتمان اصلی"}
            </p>
          </div>
        </div>
        <ChevronRight size={14} className={cn("mt-1 shrink-0 text-gray-400 transition-transform", active && "rotate-90 text-brand-500")} />
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-3">
        {dept.children.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <GitBranch size={10} />
            {dept.children.length} زیردپارتمان
          </span>
        )}
        {dept.outgoingRelations.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <Link2 size={10} />
            {dept.outgoingRelations.length} ارتباط
          </span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty / no-selection
// ─────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <FolderOpen size={24} className="text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white/80">هنوز دپارتمانی تعریف نشده</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">اولین دپارتمان را ایجاد کنید</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        <Plus size={14} />
        ایجاد دپارتمان
      </button>
    </div>
  );
}

function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Network size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">یک دپارتمان را از ستون چپ انتخاب کنید</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────
function DeptDetail({
  dept,
  allDepts,
  onAddRelation,
  onRemoveRelation,
  addingRelation,
}: {
  dept: Department;
  allDepts: Department[];
  onAddRelation: (toId: string, type: DepartmentRelationType) => Promise<void>;
  onRemoveRelation: (relId: string) => Promise<void>;
  addingRelation: boolean;
}) {
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState<DepartmentRelationType>("SUPPORTS");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const availableTargets = allDepts.filter(
    (d) =>
      d.id !== dept.id &&
      !dept.outgoingRelations.some((r) => r.toDepartmentId === d.id && r.type === relType)
  );

  async function handleAdd() {
    if (!relTarget) return;
    await onAddRelation(relTarget, relType);
    setRelTarget("");
  }

  async function handleRemove(relId: string) {
    setRemovingId(relId);
    try { await onRemoveRelation(relId); } finally { setRemovingId(null); }
  }

  const parentDept = allDepts.find((d) => d.id === dept.parentId);
  const childDepts = allDepts.filter((d) => d.parentId === dept.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">دپارتمان والد</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {parentDept?.name ?? "—  (اصلی)"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">زیردپارتمان‌ها</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {childDepts.length} واحد
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">تاریخ ایجاد</p>
          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatDate(dept.createdAt)}
          </p>
        </div>
      </div>

      {/* Children list */}
      {childDepts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <GitBranch size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">زیردپارتمان‌ها</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {childDepts.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Building2 size={11} className="text-gray-400" />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relations */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Link2 size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">ارتباطات سازمانی</h3>
        </div>

        {dept.outgoingRelations.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">هنوز ارتباطی ثبت نشده</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dept.outgoingRelations.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <RelationBadge type={rel.type} />
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {rel.toDepartment.name}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(rel.id)}
                  disabled={removingId === rel.id}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {removingId === rel.id ? <Spinner size={12} /> : <Link2Off size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add relation form */}
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/20">
          <p className="mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">افزودن ارتباط جدید</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as DepartmentRelationType)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{RELATION_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              <option value="">انتخاب دپارتمان…</option>
              {availableTargets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!relTarget || addingRelation}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingRelation ? <Spinner size={12} /> : <Plus size={13} />}
              افزودن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const { toasts, show: showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeDept = useMemo(
    () => departments.find((d) => d.id === activeId) ?? null,
    [departments, activeId]
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editing, setEditing] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [addingRelation, setAddingRelation] = useState(false);

  // ── Fetch ──
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data } = await departmentsApi.findAll();
      setDepartments(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message ?? "خطا در دریافت دپارتمان‌ها";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // ── Create ──
  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data } = await departmentsApi.create({
        name,
        parentId: newParentId || undefined,
      });
      const safe: Department = {
        ...data,
        children: data.children ?? [],
        outgoingRelations: data.outgoingRelations ?? [],
      };
      setDepartments((prev) => [...prev, safe]);
      setActiveId(safe.id);
      setCreateOpen(false);
      setNewName("");
      setNewParentId("");
      showToast("success", `دپارتمان «${safe.name}» ایجاد شد`);
    } catch (e: unknown) {
      showToast("error", (e as any)?.response?.data?.message ?? "خطا در ایجاد دپارتمان");
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ──
  async function handleEdit() {
    if (!activeDept) return;
    const name = editName.trim();
    if (!name) return;
    setEditing(true);
    try {
      await departmentsApi.update(activeDept.id, {
        name,
        parentId: editParentId || undefined,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === activeDept.id
            ? { ...d, name, parentId: editParentId || d.parentId }
            : d
        )
      );
      setEditOpen(false);
      showToast("success", `دپارتمان «${name}» ویرایش شد`);
    } catch (e: unknown) {
      showToast("error", (e as any)?.response?.data?.message ?? "خطا در ویرایش دپارتمان");
    } finally {
      setEditing(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!activeDept) return;
    setDeleting(true);
    try {
      await departmentsApi.remove(activeDept.id);
      const remaining = departments.filter((d) => d.id !== activeDept.id);
      setDepartments(remaining);
      setActiveId(remaining[0]?.id ?? null);
      setDeleteOpen(false);
      showToast("success", `دپارتمان «${activeDept.name}» حذف شد`);
    } catch (e: unknown) {
      showToast("error", (e as any)?.response?.data?.message ?? "خطا در حذف دپارتمان");
    } finally {
      setDeleting(false);
    }
  }

  // ── Add relation ──
  async function handleAddRelation(toId: string, type: DepartmentRelationType) {
    if (!activeDept) return;
    setAddingRelation(true);
    try {
      await departmentsApi.createRelation({
        fromDepartmentId: activeDept.id,
        toDepartmentId: toId,
        type,
      });
      await fetchDepartments();
      showToast("success", "ارتباط سازمانی ثبت شد");
    } catch (e: unknown) {
      showToast("error", (e as any)?.response?.data?.message ?? "خطا در ثبت ارتباط");
    } finally {
      setAddingRelation(false);
    }
  }

  // ── Remove relation ──
  async function handleRemoveRelation(relId: string) {
    try {
      await departmentsApi.removeRelation(relId);
      setDepartments((prev) =>
        prev.map((d) => ({
          ...d,
          outgoingRelations: d.outgoingRelations.filter((r) => r.id !== relId),
        }))
      );
      showToast("success", "ارتباط حذف شد");
    } catch (e: unknown) {
      showToast("error", (e as any)?.response?.data?.message ?? "خطا در حذف ارتباط");
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
            مدیریت دپارتمان‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ساختار سازمانی را تعریف و ارتباطات بین دپارتمان‌ها را مدیریت کنید
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNewName(""); setNewParentId(""); setCreateOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <Plus size={15} />
          دپارتمان جدید
        </button>
      </div>

      {/* Stats bar */}
      {!loading && !fetchError && departments.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "کل دپارتمان‌ها", value: departments.length, icon: <Building2 size={16} />, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
            { label: "دپارتمان اصلی", value: departments.filter((d) => !d.parentId).length, icon: <Network size={16} />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
            { label: "زیردپارتمان", value: departments.filter((d) => !!d.parentId).length, icon: <GitBranch size={16} />, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400" },
            { label: "کل ارتباطات", value: departments.reduce((s, d) => s + d.outgoingRelations.length, 0), icon: <Link2 size={16} />, color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", color)}>{icon}</div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left: list */}
        <aside className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در دپارتمان‌ها..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
            />
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size={22} /></div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle size={15} />{fetchError}
              </div>
              <button onClick={fetchDepartments} className="mt-2 text-xs text-red-600 underline dark:text-red-400">تلاش مجدد</button>
            </div>
          ) : departments.length === 0 ? (
            <EmptyState onAdd={() => setCreateOpen(true)} />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">دپارتمانی پیدا نشد</p>
              ) : (
                filtered.map((dept) => (
                  <DeptCard
                    key={dept.id}
                    dept={dept}
                    active={dept.id === activeId}
                    parentName={departments.find((d) => d.id === dept.parentId)?.name}
                    onClick={() => setActiveId(dept.id)}
                  />
                ))
              )}
            </div>
          )}
        </aside>

        {/* Right: detail */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!activeDept ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <NoSelection />
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Detail header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
                    <Building2 size={17} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {activeDept.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeDept.children.length} زیردپارتمان · {activeDept.outgoingRelations.length} ارتباط
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(activeDept.name);
                      setEditParentId(activeDept.parentId ?? "");
                      setEditOpen(true);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil size={12} />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                </div>
              </div>

              {/* Detail body */}
              <div className="p-6">
                <DeptDetail
                  dept={activeDept}
                  allDepts={departments}
                  onAddRelation={handleAddRelation}
                  onRemoveRelation={handleRemoveRelation}
                  addingRelation={addingRelation}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="ایجاد دپارتمان جدید" subtitle="نام و جایگاه دپارتمان در ساختار سازمانی را مشخص کنید">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">نام دپارتمان</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="مثلاً: منابع انسانی"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">دپارتمان والد (اختیاری)</label>
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              <option value="">— دپارتمان اصلی (بدون والد)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              انصراف
            </button>
            <button
              type="button"
              disabled={!newName.trim() || creating}
              onClick={handleCreate}
              className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
                newName.trim() && !creating ? "bg-brand-500 hover:bg-brand-600" : "cursor-not-allowed bg-brand-300 dark:bg-brand-800")}
            >
              {creating && <Spinner size={13} />}
              ایجاد
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="ویرایش دپارتمان" subtitle="نام یا دپارتمان والد را تغییر دهید">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">نام دپارتمان</label>
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">دپارتمان والد</label>
            <select
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            >
              <option value="">— دپارتمان اصلی (بدون والد)</option>
              {departments.filter((d) => d.id !== activeDept?.id).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditOpen(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              انصراف
            </button>
            <button
              type="button"
              disabled={!editName.trim() || editing}
              onClick={handleEdit}
              className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors",
                editName.trim() && !editing ? "bg-brand-500 hover:bg-brand-600" : "cursor-not-allowed bg-brand-300 dark:bg-brand-800")}
            >
              {editing && <Spinner size={13} />}
              ذخیره
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="حذف دپارتمان" subtitle="این عمل برگشت‌پذیر نیست">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  آیا مطمئن هستید که می‌خواهید دپارتمان <strong>«{activeDept?.name}»</strong> را حذف کنید؟
                </p>
                {(activeDept?.children?.length ?? 0) > 0 && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    ⚠️ این دپارتمان دارای {activeDept?.children.length} زیردپارتمان است. ابتدا آن‌ها را جابجا یا حذف کنید.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              انصراف
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleting && <Spinner size={13} />}
              حذف دپارتمان
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
