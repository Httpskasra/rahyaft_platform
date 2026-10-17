import type { PermMatrix, Role, ScopeType } from "./types";

export type PermissionModule = {
  resource: string;
  label: string;
  description: string;
  group: "مدیریت سازمان" | "عملیات" | "فرم و فرایند";
  actions: string[];
  scopeMode?: "scoped" | "global";
};

export const PERMISSION_MODULES: PermissionModule[] = [
  { resource: "users", label: "کاربران", description: "مشاهده و مدیریت حساب‌های کاربران", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "roles", label: "نقش‌ها و دسترسی‌ها", description: "ساخت نقش، ویرایش مجوزها و تخصیص نقش", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete", "assign"], scopeMode: "global" },
  { resource: "departments", label: "دپارتمان‌ها و چارت سازمانی", description: "مدیریت ساختار، روابط واحدها و مشاهده چارت سازمانی", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"], scopeMode: "global" },
  { resource: "user-info", label: "اطلاعات پرسنلی", description: "اطلاعات تکمیلی و پرونده کاربران", group: "مدیریت سازمان", actions: ["read", "create", "update", "delete"] },
  { resource: "attendance", label: "حضور و غیاب", description: "مشاهده گزارش‌ها و ورود اطلاعات تردد", group: "عملیات", actions: ["read", "create"] },
  { resource: "customers", label: "CRM و مشتریان", description: "مشتری، مخاطب، فرصت فروش، فعالیت و تحلیل مشتری", group: "عملیات", actions: ["read", "create", "update", "delete", "manage-contacts", "manage-opportunities", "log-activity", "analyze"] },
  { resource: "repairs", label: "تعمیرات", description: "پرونده‌ها، وضعیت و تخصیص تعمیرات", group: "عملیات", actions: ["read", "create", "update", "assign"] },
  { resource: "communication", label: "ارتباطات سازمانی", description: "پیام‌ها و گفتگوهای داخلی", group: "عملیات", actions: ["read", "create", "update"] },
  { resource: "recruitment-applications", label: "درخواست‌های استخدام", description: "مشاهده و گردش مراحل بررسی متقاضی", group: "عملیات", actions: ["read", "review-initial", "conduct-initial-interview", "assign-technical-interviewer", "final-approve"] },
  { resource: "recruitment-interviews", label: "مصاحبه فنی استخدام", description: "ثبت نتیجه مصاحبه فنی", group: "عملیات", actions: ["conduct-technical-interview"] },
  { resource: "recruitment-settings", label: "تنظیمات استخدام", description: "فرم‌ها، نسخه‌ها و فرصت‌های شغلی", group: "عملیات", actions: ["manage"], scopeMode: "global" },
  { resource: "forms", label: "مدیریت فرم‌ها", description: "ساخت، ویرایش و حذف فرم‌ها", group: "فرم و فرایند", actions: ["read", "create", "update", "delete"], scopeMode: "global" },
  { resource: "form-submissions", label: "ثبت و مشاهده فرم‌ها", description: "تکمیل فرم و مشاهده ثبت‌ها", group: "فرم و فرایند", actions: ["read", "create"] },
  { resource: "approvals", label: "تأیید فرم‌ها", description: "تأیید یا رد مراحل گردش کار", group: "فرم و فرایند", actions: ["approve"] },
  { resource: "production-flows", label: "خطوط و Flow تولید", description: "تعریف و مدیریت الگوی خط تولید", group: "فرم و فرایند", actions: ["read", "create", "update", "delete"], scopeMode: "global" },
  { resource: "production-runs", label: "محصولات و اجرای تولید", description: "ایجاد Run، اجرای مرحله، نظارت، تأیید و QC", group: "فرم و فرایند", actions: ["read", "create", "update", "execute", "supervise", "approve", "qc"] },
];

const RESOURCE_LABELS = Object.fromEntries(PERMISSION_MODULES.map((m) => [m.resource, m.label]));
const ACTION_LABELS: Record<string, string> = {
  create: "ایجاد", read: "مشاهده", update: "ویرایش / تغییر وضعیت", delete: "حذف", approve: "تأیید / رد", assign: "تخصیص",
  manage: "مدیریت کامل", "manage-contacts": "مدیریت مخاطبان", "manage-opportunities": "مدیریت فرصت‌های فروش", "log-activity": "ثبت فعالیت", analyze: "تحلیل AI",
  execute: "اجرای مرحله", supervise: "بررسی ناظر", qc: "کنترل کیفیت", "review-initial": "بررسی اولیه", "conduct-initial-interview": "مصاحبه اولیه",
  "assign-technical-interviewer": "تخصیص مصاحبه‌گر فنی", "conduct-technical-interview": "مصاحبه فنی", "final-approve": "تأیید نهایی استخدام",
};
export function getResourceLabel(r: string) { return RESOURCE_LABELS[r] ?? r; }
export function getActionLabel(a: string) { return ACTION_LABELS[a] ?? a; }
export function getActionColor(action: string) {
  if (action === "read") return { bg:"bg-blue-50",text:"text-blue-700",darkBg:"dark:bg-blue-500/10",darkText:"dark:text-blue-300",dot:"bg-blue-500" };
  if (["create","execute","log-activity"].includes(action)) return { bg:"bg-emerald-50",text:"text-emerald-700",darkBg:"dark:bg-emerald-500/10",darkText:"dark:text-emerald-300",dot:"bg-emerald-500" };
  if (["update","assign","manage","manage-contacts","manage-opportunities"].includes(action)) return { bg:"bg-amber-50",text:"text-amber-700",darkBg:"dark:bg-amber-500/10",darkText:"dark:text-amber-300",dot:"bg-amber-500" };
  if (action === "delete") return { bg:"bg-red-50",text:"text-red-700",darkBg:"dark:bg-red-500/10",darkText:"dark:text-red-300",dot:"bg-red-500" };
  return { bg:"bg-violet-50",text:"text-violet-700",darkBg:"dark:bg-violet-500/10",darkText:"dark:text-violet-300",dot:"bg-violet-500" };
}

export const SCOPE_LABELS: Record<ScopeType, string> = { SELF:"فقط اطلاعات خودش", TEAM:"تیم خودش", DEPARTMENT:"دپارتمان خودش", DEPARTMENT_SUBTREE:"دپارتمان خودش و زیرمجموعه‌ها", RELATED_DEPARTMENTS:"دپارتمان‌های مرتبط", ORG_WIDE:"کل سازمان" };
export const SIMPLE_SCOPE_OPTIONS: Array<{value:ScopeType;label:string;hint:string}> = [
  { value:"SELF",label:"فقط خودش",hint:"فقط داده‌های مربوط به خود کاربر" }, { value:"TEAM",label:"تیم مستقیم",hint:"افرادی که مستقیماً زیرمجموعه کاربر هستند" },
  { value:"DEPARTMENT",label:"دپارتمان خودش",hint:"داده‌های واحد سازمانی کاربر" }, { value:"DEPARTMENT_SUBTREE",label:"واحد و زیرمجموعه‌ها",hint:"واحد کاربر و تمام زیرواحدها" },
  { value:"RELATED_DEPARTMENTS",label:"واحدهای مرتبط",hint:"بر اساس رابطه تعریف‌شده بین دپارتمان‌ها" }, { value:"ORG_WIDE",label:"کل سازمان",hint:"بدون محدودیت واحد سازمانی" },
];
export type SimpleAccessLevel = "NONE"|"VIEW"|"MANAGE"|"FULL"|"CUSTOM";
export const ACCESS_LEVELS = [
  {value:"NONE",label:"بدون دسترسی",hint:"این بخش را نمی‌بیند"},{value:"VIEW",label:"فقط مشاهده",hint:"فقط امکان دیدن اطلاعات"},
  {value:"MANAGE",label:"مدیریت",hint:"همه عملیات روزمره به‌جز حذف"},{value:"FULL",label:"دسترسی کامل",hint:"تمام امکانات این بخش"},
] as const;
export function actionsForLevel(actions:string[],level:Exclude<SimpleAccessLevel,"CUSTOM">){ if(level==="NONE")return[]; if(level==="VIEW")return actions.includes("read")?["read"]:[]; if(level==="MANAGE")return actions.filter(a=>a!=="delete"); return actions; }
export function detectAccessLevel(moduleActions:string[],enabledActions:string[]):SimpleAccessLevel{const n=[...enabledActions].sort().join("|");for(const l of ["NONE","VIEW","MANAGE","FULL"] as const){if([...actionsForLevel(moduleActions,l)].sort().join("|")===n)return l;}return"CUSTOM";}
export function getPermissionKey(action:string,resource:string){return `${action}:${resource}`;}
export function countPermissions(role:Role){return(role.permissions??[]).length;}
export function buildMatrix(role:Role,resources:string[],actions:string[]):PermMatrix{const matrix:PermMatrix={};for(const res of resources)for(const act of actions){const key=getPermissionKey(act,res);const found=(role.permissions??[]).find(p=>p.permission.action===act&&p.permission.resource===res);const module=PERMISSION_MODULES.find(m=>m.resource===res);matrix[key]={enabled:!!found,scope:found?.scope??(module?.scopeMode==="global"?"ORG_WIDE":"DEPARTMENT")};}return matrix;}
export type RoleTemplate={id:string;title:string;description:string;grants:Array<{resource:string;level:Exclude<SimpleAccessLevel,"CUSTOM">;scope:ScopeType}>};
export const ROLE_TEMPLATES:RoleTemplate[]=[
  {id:"empty",title:"نقش خالی",description:"دسترسی‌ها را خودتان انتخاب کنید",grants:[]},
  {id:"employee",title:"کارمند عادی",description:"دسترسی پایه برای کار روزمره",grants:[{resource:"form-submissions",level:"MANAGE",scope:"SELF"},{resource:"communication",level:"MANAGE",scope:"SELF"},{resource:"attendance",level:"VIEW",scope:"SELF"},{resource:"production-runs",level:"VIEW",scope:"SELF"}]},
  {id:"department-manager",title:"مدیر دپارتمان",description:"مدیریت اطلاعات و عملیات واحد خودش",grants:[{resource:"users",level:"VIEW",scope:"DEPARTMENT_SUBTREE"},{resource:"user-info",level:"VIEW",scope:"DEPARTMENT_SUBTREE"},{resource:"attendance",level:"MANAGE",scope:"DEPARTMENT_SUBTREE"},{resource:"customers",level:"MANAGE",scope:"DEPARTMENT_SUBTREE"},{resource:"form-submissions",level:"MANAGE",scope:"DEPARTMENT_SUBTREE"},{resource:"approvals",level:"FULL",scope:"DEPARTMENT_SUBTREE"},{resource:"communication",level:"MANAGE",scope:"DEPARTMENT_SUBTREE"}]},
  {id:"form-manager",title:"مسئول فرم‌ها",description:"مدیریت فرم، ثبت‌ها و تأییدها",grants:[{resource:"forms",level:"MANAGE",scope:"ORG_WIDE"},{resource:"form-submissions",level:"MANAGE",scope:"ORG_WIDE"},{resource:"approvals",level:"FULL",scope:"ORG_WIDE"}]},
  {id:"system-manager",title:"مدیر سیستم",description:"دسترسی مدیریتی گسترده",grants:PERMISSION_MODULES.map(m=>({resource:m.resource,level:"FULL" as const,scope:"ORG_WIDE" as ScopeType}))},
];
export function permissionsFromTemplate(template:RoleTemplate){return template.grants.flatMap(grant=>{const module=PERMISSION_MODULES.find(m=>m.resource===grant.resource);if(!module)return[];const scope=module.scopeMode==="global"?"ORG_WIDE":grant.scope;return actionsForLevel(module.actions,grant.level).map(action=>({action,resource:module.resource,scope}));});}
