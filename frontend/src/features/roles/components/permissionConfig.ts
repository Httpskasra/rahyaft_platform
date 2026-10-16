import type { PermMatrix, Role, ScopeType } from "./types";

export type PermissionModule = {
  resource: string;
  label: string;
  description: string;
  group: "مدیریت سازمان" | "عملیات" | "فرم و فرایند";
  actions: string[];
};

export const PERMISSION_MODULES: PermissionModule[] = [
  { resource: "users", label: "کاربران", description: "مشاهده و مدیریت حساب‌های کاربران", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "roles", label: "نقش‌ها و دسترسی‌ها", description: "ساخت نقش و تعیین سطح دسترسی", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "departments", label: "دپارتمان‌ها", description: "مدیریت ساختار و واحدهای سازمانی", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "user-info", label: "اطلاعات پرسنلی", description: "اطلاعات تکمیلی و پرونده کاربران", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "attendance", label: "حضور و غیاب", description: "مشاهده و ثبت اطلاعات حضور و غیاب", group: "عملیات", actions: ["read", "create"] },
  { resource: "repairs", label: "تعمیرات", description: "پرونده‌ها و وضعیت تعمیرات", group: "عملیات", actions: ["read", "create", "update"] },
  { resource: "communication", label: "ارتباطات سازمانی", description: "پیام‌ها و گفتگوهای داخلی", group: "عملیات", actions: ["read", "create", "update"] },
  { resource: "reports", label: "گزارش‌ها", description: "مشاهده گزارش‌های مدیریتی", group: "عملیات", actions: ["read"] },
  { resource: "forms", label: "مدیریت فرم‌ها", description: "ساخت، ویرایش و حذف فرم‌ها", group: "فرم و فرایند", actions: ["read", "create", "update", "delete"] },
  { resource: "form-submissions", label: "ثبت و مشاهده فرم‌ها", description: "تکمیل فرم و مشاهده ثبت‌ها", group: "فرم و فرایند", actions: ["read", "create"] },
  { resource: "approvals", label: "تأیید فرم‌ها", description: "تأیید یا رد مراحل گردش کار", group: "فرم و فرایند", actions: ["approve"] },
  { resource: "production-flows", label: "فرایندهای تولید", description: "تعریف و مدیریت گردش تولید", group: "فرم و فرایند", actions: ["read", "create", "update", "delete"] },
  { resource: "production-runs", label: "سفارش‌های تولید", description: "ثبت و پیگیری اجرای فرایند تولید", group: "فرم و فرایند", actions: ["read", "create", "update"] },
];

const RESOURCE_LABELS = Object.fromEntries(PERMISSION_MODULES.map((m) => [m.resource, m.label]));
const ACTION_LABELS: Record<string, string> = { create: "ایجاد", read: "مشاهده", update: "ویرایش", delete: "حذف", approve: "تأیید / رد" };

export function getResourceLabel(r: string) { return RESOURCE_LABELS[r] ?? r; }
export function getActionLabel(a: string) { return ACTION_LABELS[a] ?? a; }

export const SCOPE_LABELS: Record<ScopeType, string> = {
  SELF: "فقط اطلاعات خودش",
  TEAM: "تیم خودش",
  DEPARTMENT: "دپارتمان خودش",
  DEPARTMENT_SUBTREE: "دپارتمان خودش و زیرمجموعه‌ها",
  RELATED_DEPARTMENTS: "دپارتمان‌های مرتبط",
  ORG_WIDE: "کل سازمان",
};

export const SIMPLE_SCOPE_OPTIONS: Array<{ value: ScopeType; label: string; hint: string }> = [
  { value: "SELF", label: "فقط خودش", hint: "فقط داده‌هایی که به خود کاربر مربوط است" },
  { value: "DEPARTMENT", label: "دپارتمان خودش", hint: "داده‌های واحد سازمانی کاربر" },
  { value: "DEPARTMENT_SUBTREE", label: "واحد و زیرمجموعه‌ها", hint: "برای مدیران واحدها مناسب است" },
  { value: "ORG_WIDE", label: "کل سازمان", hint: "بدون محدودیت واحد سازمانی" },
];

export type SimpleAccessLevel = "NONE" | "VIEW" | "MANAGE" | "FULL" | "CUSTOM";
export const ACCESS_LEVELS: Array<{ value: Exclude<SimpleAccessLevel, "CUSTOM">; label: string; hint: string }> = [
  { value: "NONE", label: "بدون دسترسی", hint: "این بخش را نمی‌بیند" },
  { value: "VIEW", label: "فقط مشاهده", hint: "فقط امکان دیدن اطلاعات" },
  { value: "MANAGE", label: "مدیریت", hint: "مشاهده، ایجاد و ویرایش" },
  { value: "FULL", label: "دسترسی کامل", hint: "تمام امکانات این بخش" },
];

export function actionsForLevel(actions: string[], level: Exclude<SimpleAccessLevel, "CUSTOM">) {
  if (level === "NONE") return [];
  if (level === "VIEW") return actions.includes("read") ? ["read"] : [];
  if (level === "MANAGE") return actions.filter((a) => ["read", "create", "update", "approve"].includes(a));
  return actions;
}

export function detectAccessLevel(moduleActions: string[], enabledActions: string[]): SimpleAccessLevel {
  const normalized = [...enabledActions].sort().join("|");
  for (const level of ["NONE", "VIEW", "MANAGE", "FULL"] as const) {
    if ([...actionsForLevel(moduleActions, level)].sort().join("|") === normalized) return level;
  }
  return "CUSTOM";
}

export function getPermissionKey(action: string, resource: string) { return `${action}:${resource}`; }
export function countPermissions(role: Role) { return (role.permissions ?? []).length; }
export function buildMatrix(role: Role, resources: string[], actions: string[]): PermMatrix {
  const matrix: PermMatrix = {};
  for (const res of resources) for (const act of actions) {
    const key = getPermissionKey(act, res);
    const found = (role.permissions ?? []).find((p) => p.permission.action === act && p.permission.resource === res);
    matrix[key] = { enabled: !!found, scope: found?.scope ?? "DEPARTMENT" };
  }
  return matrix;
}

export type RoleTemplate = {
  id: string;
  title: string;
  description: string;
  grants: Array<{ resource: string; level: Exclude<SimpleAccessLevel, "CUSTOM">; scope: ScopeType }>;
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  { id: "empty", title: "نقش خالی", description: "دسترسی‌ها را خودتان انتخاب کنید", grants: [] },
  {
    id: "employee", title: "کارمند عادی", description: "دسترسی پایه برای کار روزمره",
    grants: [
      { resource: "form-submissions", level: "MANAGE", scope: "SELF" },
      { resource: "communication", level: "MANAGE", scope: "SELF" },
      { resource: "attendance", level: "VIEW", scope: "SELF" },
    ],
  },
  {
    id: "department-manager", title: "مدیر دپارتمان", description: "مدیریت اطلاعات و عملیات واحد خودش",
    grants: [
      { resource: "users", level: "VIEW", scope: "DEPARTMENT_SUBTREE" },
      { resource: "user-info", level: "VIEW", scope: "DEPARTMENT_SUBTREE" },
      { resource: "attendance", level: "MANAGE", scope: "DEPARTMENT_SUBTREE" },
      { resource: "forms", level: "VIEW", scope: "DEPARTMENT_SUBTREE" },
      { resource: "form-submissions", level: "MANAGE", scope: "DEPARTMENT_SUBTREE" },
      { resource: "approvals", level: "FULL", scope: "DEPARTMENT_SUBTREE" },
      { resource: "communication", level: "MANAGE", scope: "DEPARTMENT_SUBTREE" },
      { resource: "reports", level: "VIEW", scope: "DEPARTMENT_SUBTREE" },
    ],
  },
  {
    id: "form-manager", title: "مسئول فرم‌ها", description: "ساخت فرم، مشاهده ثبت‌ها و انجام تأییدها",
    grants: [
      { resource: "forms", level: "MANAGE", scope: "ORG_WIDE" },
      { resource: "form-submissions", level: "MANAGE", scope: "ORG_WIDE" },
      { resource: "approvals", level: "FULL", scope: "ORG_WIDE" },
    ],
  },
  {
    id: "system-manager", title: "مدیر سیستم", description: "دسترسی مدیریتی گسترده به بخش‌های سازمان",
    grants: PERMISSION_MODULES.map((m) => ({ resource: m.resource, level: "FULL" as const, scope: "ORG_WIDE" as ScopeType })),
  },
];

export function permissionsFromTemplate(template: RoleTemplate) {
  return template.grants.flatMap((grant) => {
    const module = PERMISSION_MODULES.find((m) => m.resource === grant.resource);
    if (!module) return [];
    return actionsForLevel(module.actions, grant.level).map((action) => ({
      action, resource: module.resource, scope: grant.scope,
    }));
  });
}
