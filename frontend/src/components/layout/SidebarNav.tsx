"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { translations } from "@/lib/i18n";
import {
  ChevronDown,
  LayoutDashboard,
  User,
  // CalendarDays,
  // User,
  // ListTodo,
  // FileText,
  // Table2,
  // MessageSquare,
  // Mail,
  // Receipt,
  IdCardLanyard,
  Wrench,
  FileText as FileTextIcon,
  Building2,
  // PieChart,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";

const t = translations;

type GroupKey =
  | "داشبورد"
  | "تقویم"
  | "پروفایل"
  | "نقش ها"
  | "دپارتمان‌ها"
  | "فرم‌ها"
  | "جداول"
  | "صفحات"
  | "چت"
  | "ایمیل"
  | "فاکتور"
  | "نمودارها"
  | "تعمیرات";

function MenuGroupTitle({
  collapsed,
  title,
}: {
  collapsed: boolean;
  title: string;
}) {
  return (
    <h3 className="mb-4 text-xs uppercase leading-[20px] text-indigo-400 dark:text-purple-300/70">
      <span className={collapsed ? "lg:hidden" : ""}>{title}</span>
      <span className={collapsed ? "hidden lg:block mx-auto" : "hidden"}>
        •••
      </span>
    </h3>
  );
}

// function MenuItem({
//   collapsed,
//   icon,
//   label,
//   href,
//   active,
//   right,
// }: {
//   collapsed: boolean;
//   icon: React.ReactNode;
//   label: string;
//   href: string;
//   active?: boolean;
//   right?: React.ReactNode;
// }) {
//   return (
//     <Link
//       href={href}
//       className={[
//         "menu-item group",
//         active ? "menu-item-active" : "menu-item-inactive",
//       ].join(" ")}>
//       <span className={active ? "text-brand-500 dark:text-brand-400" : ""}>
//         {icon}
//       </span>

//       <span
//         className={["menu-item-text", collapsed ? "lg:hidden" : ""].join(" ")}>
//         {label}
//       </span>

//       {right}
//     </Link>
//   );
// }

function DropdownItem({
  href,
  label,
  active,
  badge,
}: {
  href: string;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "menu-dropdown-item group",
        active ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive",
      ].join(" ")}>
      {label}
      {badge ?
        <span className="absolute left-3 flex items-center gap-1">{badge}</span>
      : null}
    </Link>
  );
}

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const canReadRoles = usePermission("read", "roles");
  const canReadUsers = usePermission("read", "users");
  const canReadDepartments = usePermission("read", "departments");
  // تعیین کدام dropdown باید باز باشد بر اساس pathname
  const getInitialOpenGroup = (): GroupKey => {
    if (
      pathname.startsWith("/dashboard/repairs") ||
      pathname.startsWith("/dashboard/customers") ||
      pathname.startsWith("/dashboard/devices") ||
      pathname.startsWith("/dashboard/technicians")
    ) {
      return "تعمیرات";
    }
    return "داشبورد";
  };

  const [open, setOpen] = React.useState<GroupKey>(getInitialOpenGroup());

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav>
      <div>
        <MenuGroupTitle collapsed={collapsed} title={t.common.menu} />

        <ul className="mb-6 flex flex-col gap-4">
          {/* Dashboard dropdown */}
          <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "داشبورد" ? ("" as any) : "داشبورد"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "داشبورد" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <LayoutDashboard size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.dashboard}
              </span>

              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "داشبورد" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {
              <div className="translate transform  overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown",
                    open === "داشبورد" ? "open" : "closed",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/ecommerce"
                      label={t.dashboard.ecommerce}
                      active={isActive("/ecommerce")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/analytics"
                      label={t.dashboard.analytics}
                      active={isActive("/analytics")}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/marketing"
                      label={t.dashboard.marketing}
                      active={isActive("/marketing")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/crm"
                      label={t.dashboard.crm}
                      active={isActive("/crm")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/stocks"
                      label={t.dashboard.stocks}
                      active={isActive("/stocks")}
                      badge={
                        <>
                          <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                            {t.dashboard.new}
                          </span>
                          <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                            {t.dashboard.pro}
                          </span>
                        </>
                      }
                    />
                  </li>
                </ul>
              </div>
            }
          </li>
          {/* fixing dropdown */}
          <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "تعمیرات" ? ("" as any) : "تعمیرات"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "تعمیرات" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <Wrench size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>تعمیرات</span>

              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "تعمیرات" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {
              <div className="translate transform  overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown",
                    open === "تعمیرات" ? "open" : "closed",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs"
                      label="اصلی"
                      active={isActive("/dashboard/repairs")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs/customers"
                      label="مشتری "
                      active={isActive("/dashboard/repairs/customers")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs/devices"
                      label="دستگاه "
                      active={isActive("/dashboard/repairs/devices")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs/orders"
                      label="سفارش "
                      active={isActive("/dashboard/repairs/orders")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs/technicians"
                      label="تکنسین "
                      active={isActive("/dashboard/repairs/technicians")}
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/dashboard/repairs/reports"
                      label="گزارش ها "
                      active={isActive("/dashboard/repairs/reports")}
                    />
                  </li>
                </ul>
              </div>
            }
          </li>
          {/* profile dropdown */}
          <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "پروفایل" ? ("" as any) : "پروفایل"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "پروفایل" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <User size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>پروفایل</span>

              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "پروفایل" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {
              <div className="translate transform  overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown",
                    open === "پروفایل" ? "open" : "closed",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/dashboard/profile"
                      label="اطلاعات کاربری"
                      active={isActive("/dashboard/profile")}
                    />
                  </li>
                </ul>
              </div>
            }
          </li>
          {true &&<li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "نقش ها" ? ("" as any) : "نقش ها"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "نقش ها" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <IdCardLanyard size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>نقش ها</span>

              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "نقش ها" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {
              <div className="translate transform  overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown",
                    open === "نقش ها" ? "open" : "closed",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/dashboard/roles"
                      label="افزودن نقش و دسترسی"
                      active={isActive("/dashboard/roles")}
                    />
                  </li>
                </ul>
              </div>
            }
          </li>}

          {canReadDepartments && <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "دپارتمان‌ها" ? ("" as any) : "دپارتمان‌ها"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "دپارتمان‌ها" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <Building2 size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>دپارتمان‌ها</span>
              <span className={["menu-item-arrow", collapsed ? "lg:hidden" : ""].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "دپارتمان‌ها" ? "rotate-180" : ""}
                />
              </span>
            </button>
            <div className="translate transform overflow-hidden">
              <ul className={[
                "menu-dropdown",
                open === "دپارتمان‌ها" ? "open" : "closed",
                collapsed ? "lg:hidden" : "",
              ].join(" ")}>
                <li>
                  <DropdownItem
                    href="/dashboard/departments"
                    label="مدیریت دپارتمان‌ها"
                    active={isActive("/dashboard/departments")}
                  />
                </li>
              </ul>
            </div>
          </li>}


          {<li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "فرم‌ها" ? ("" as any) : "فرم‌ها"))
              }
              className={[
                "menu-item group w-full text-right",
                open === "فرم‌ها" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <FileTextIcon size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>فرم‌ها</span>
              <span className={["menu-item-arrow", collapsed ? "lg:hidden" : ""].join(" ")}>
                <ChevronDown size={18} className={open === "فرم‌ها" ? "rotate-180" : ""} />
              </span>
            </button>
            <div className="translate transform overflow-hidden">
              <ul className={[
                "menu-dropdown",
                open === "فرم‌ها" ? "open" : "closed",
                collapsed ? "lg:hidden" : "",
              ].join(" ")}>
                <li>
                  <DropdownItem
                    href="/dashboard/forms"
                    label="مدیریت فرم‌ها"
                    active={isActive("/dashboard/forms")}
                  />
                </li>
              </ul>
            </div>
          </li>}

          {/* <li>
            <MenuItem
              collapsed={collapsed}
              href="/calendar"
              label={t.common.calendar}
              icon={<CalendarDays size={20} />}
            />
          </li> */}

          {/* <li>
            <MenuItem
              collapsed={collapsed}
              href="/profile"
              label={t.common.userProfile}
              icon={<User size={20} />}
            />
          </li> */}

          {/* Task dropdown */}
          {/* <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "وظیفه" ? ("" as any) : "وظیفه"))
              }
              className={[
                "menu-item group w-full text-left",
                open === "وظیفه" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <ListTodo size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.task}
              </span>
              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "وظیفه" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {
              <div className="translate transform overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown mt-2 flex flex-col gap-1 pr-9",
                    open === "وظیفه" ? "open" : "closed",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/task/list"
                      label={t.task.list}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/task/kanban"
                      label={t.task.kanban}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                </ul>
              </div>
            }
          </li> */}

          {/* Forms dropdown */}
          {/* <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "فرم‌ها" ? ("" as any) : "فرم‌ها"))
              }
              className={[
                "menu-item group w-full text-left",
                open === "فرم‌ها" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <FileText size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.forms}
              </span>
              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "فرم‌ها" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {open === "فرم‌ها" && (
              <div className="translate transform overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown mt-2 flex flex-col gap-1 pr-9",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/forms/elements"
                      label={t.forms.elements}
                    />
                  </li>
                  <li>
                    <DropdownItem href="/forms/layout" label={t.forms.layout} />
                  </li>
                </ul>
              </div>
            )}
          </li> */}

          {/* Tables dropdown */}
          {/* <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "جداول" ? ("" as any) : "جداول"))
              }
              className={[
                "menu-item group w-full text-left",
                open === "جداول" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <Table2 size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.tables}
              </span>
              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "جداول" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {open === "جداول" && (
              <div className="translate transform overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown mt-2 flex flex-col gap-1 pr-9",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem href="/tables/basic" label={t.tables.basic} />
                  </li>
                  <li>
                    <DropdownItem
                      href="/tables/data"
                      label={t.tables.data}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                </ul>
              </div>
            )}
          </li> */}
        </ul>
      </div>

      {/* Support */}
      {/* <div>
        <MenuGroupTitle collapsed={collapsed} title={t.common.support} />
        <ul className="mb-6 flex flex-col gap-4">
          <li>
            <MenuItem
              collapsed={collapsed}
              href="/chat"
              label={t.common.chat}
              icon={<MessageSquare size={20} />}
            />
          </li>
          <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "ایمیل" ? ("" as any) : "ایمیل"))
              }
              className={[
                "menu-item group w-full text-left",
                open === "ایمیل" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <Mail size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.email}
              </span>
              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "ایمیل" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {open === "ایمیل" && (
              <div className="translate transform overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown mt-2 flex flex-col gap-1 pr-9",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/email/inbox"
                      label={t.email.inbox}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/email/details"
                      label={t.email.details}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                </ul>
              </div>
            )}
          </li>
          <li>
            <MenuItem
              collapsed={collapsed}
              href="/invoice"
              label={t.common.invoice}
              icon={<Receipt size={20} />}
            />
          </li>
        </ul>
      </div> */}

      {/* Others */}
      {/* <div>
        <MenuGroupTitle collapsed={collapsed} title={t.common.others} />
        <ul className="mb-6 flex flex-col gap-4">
          <li>
            <button
              type="button"
              onClick={() =>
                setOpen((v) => (v === "نمودارها" ? ("" as any) : "نمودارها"))
              }
              className={[
                "menu-item group w-full text-left",
                open === "نمودارها" ? "menu-item-active" : "menu-item-inactive",
              ].join(" ")}>
              <PieChart size={20} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {t.common.charts}
              </span>
              <span
                className={[
                  "menu-item-arrow",
                  collapsed ? "lg:hidden" : "",
                ].join(" ")}>
                <ChevronDown
                  size={18}
                  className={open === "نمودارها" ? "rotate-180" : ""}
                />
              </span>
            </button>

            {open === "نمودارها" && (
              <div className="translate transform overflow-hidden">
                <ul
                  className={[
                    "menu-dropdown mt-2 flex flex-col gap-1 pr-9",
                    collapsed ? "lg:hidden" : "",
                  ].join(" ")}>
                  <li>
                    <DropdownItem
                      href="/charts/line"
                      label={t.charts.line}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/charts/bar"
                      label={t.charts.bar}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                  <li>
                    <DropdownItem
                      href="/charts/pie"
                      label={t.charts.pie}
                      badge={
                        <span className="menu-dropdown-badge menu-dropdown-badge-inactive">
                          {t.dashboard.pro}
                        </span>
                      }
                    />
                  </li>
                </ul>
              </div>
            )}
          </li>
        </ul>
      </div> */}
    </nav>
  );
}
