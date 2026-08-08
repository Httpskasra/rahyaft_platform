import type { PermMatrix, Role, ScopeType } from "./types";

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

export function getResourceLabel(r: string) {
  return RESOURCE_LABELS[r] ?? r;
}

export function getActionLabel(a: string) {
  return ACTION_LABELS[a] ?? a;
}

export const ACTION_COLORS: Record<
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

export const DEFAULT_ACTION_COLOR = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  darkBg: "dark:bg-gray-500/10",
  darkText: "dark:text-gray-400",
  dot: "bg-gray-400",
};

export function getActionColor(action: string) {
  return ACTION_COLORS[action] ?? DEFAULT_ACTION_COLOR;
}

export const SCOPE_LABELS: Record<ScopeType, string> = {
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


export function getPermissionKey(action: string, resource: string) {
  return `${action}:${resource}`;
}

export function countPermissions(role: Role) {
  return (role.permissions ?? []).length;
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// Permission badge
// ─────────────────────────────────────────────────────────────

export function buildMatrix(
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
