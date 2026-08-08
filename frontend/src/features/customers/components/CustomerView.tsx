import {
  Building2, CalendarClock, Edit3, Mail, MapPin, Phone, Plus, RefreshCw,
  Sparkles, Trash2, UserRound, Users, WalletCards, Wrench,
} from "lucide-react";
import type { CustomerDetail } from "@/lib/api/customers";
import {
  activityFa, card, dateFa, money, nameOf, oppStatusFa, statusFa, typeFa,
} from "../constants";

export function CustomerView({
  customer,
  refresh,
  onEdit,
  onDelete,
  onContact,
  onOpportunity,
  onActivity,
}: {
  customer: CustomerDetail;
  refresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onContact: () => void;
  onOpportunity: () => void;
  onActivity: () => void;
}) {
  const ai = customer.aiAnalyses?.[0];
  return (
    <div className="space-y-5">
      <section className={`${card} p-5`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
              {customer.type === "ORGANIZATION" ?
                <Building2 size={26} />
              : <UserRound size={26} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {nameOf(customer)}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                  {statusFa[customer.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {typeFa[customer.type]} • ثبت در {dateFa(customer.registeredAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={refresh} className="rounded-xl border p-2.5">
              <RefreshCw size={17} />
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <Edit3 size={16} /> ویرایش
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600">
              <Trash2 size={16} /> حذف
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Phone, customer.mobile || customer.phone, "شماره تماس"],
            [Mail, customer.email, "ایمیل"],
            [
              MapPin,
              [customer.province, customer.city].filter(Boolean).join("، "),
              "موقعیت",
            ],
            [WalletCards, customer.occupation, "حوزه فعالیت"],
          ].map(([I, v, l]: any, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <I size={15} />
                {l}
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{v || "—"}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-3">
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">تحلیل هوش مصنوعی مشتری</h3>
            <Sparkles className="text-violet-500" size={20} />
          </div>
          {ai ?
            <div className="space-y-4">
              <p className="leading-7 text-gray-700 dark:text-gray-300">
                {ai.summary}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric title="سطح ریسک" value={ai.riskLevel || "—"} />
                <Metric title="پتانسیل فروش" value={ai.salesPotential || "—"} />
              </div>
              {ai.nextBestAction && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-500/10">
                  <p className="text-xs font-bold text-violet-700">
                    اقدام پیشنهادی بعدی
                  </p>
                  <p className="mt-2 text-sm">{ai.nextBestAction}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {ai.tags?.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                منبع: {ai.source} {ai.modelName ? `• ${ai.modelName}` : ""} •{" "}
                {dateFa(ai.createdAt)}
              </p>
            </div>
          : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
              هنوز تحلیلی ثبت نشده است. Worker پس از رویدادهای مشتری تحلیل جدید
              تولید می‌کند.
            </div>
          }
        </div>
        <div className={`${card} p-5`}>
          <h3 className="mb-4 font-bold">آمار مشتری</h3>
          <div className="space-y-3">
            <Metric title="مخاطبین" value={customer._count?.contacts || 0} />
            <Metric
              title="فرصت‌های فروش"
              value={customer._count?.salesOpportunities || 0}
            />
            <Metric
              title="پرونده‌های تعمیر"
              value={customer._count?.repairs || 0}
            />
            <Metric
              title="فعالیت‌ها"
              value={customer._count?.activities || 0}
            />
          </div>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <ListCard
          icon={<Users size={19} />}
          title="مخاطبین سازمانی"
          action={customer.type === "ORGANIZATION" ? onContact : undefined}>
          {customer.contacts?.length ?
            customer.contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex justify-between">
                  <b>{c.fullName}</b>
                  {c.isPrimary && (
                    <span className="text-xs text-brand-600">مخاطب اصلی</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {c.role || "بدون سمت"} • {c.mobile || c.phone || "بدون شماره"}
                </p>
              </div>
            ))
          : <Empty
              text={
                customer.type === "PERSON" ?
                  "مخاطب سازمانی فقط برای مشتری سازمانی است"
                : "مخاطبی ثبت نشده"
              }
            />
          }
        </ListCard>
        <ListCard
          icon={<WalletCards size={19} />}
          title="فرصت‌های فروش"
          action={onOpportunity}>
          {customer.salesOpportunities?.length ?
            customer.salesOpportunities.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex justify-between gap-2">
                  <b>{o.title}</b>
                  <span className="text-xs text-brand-600">
                    {oppStatusFa[o.status]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{money(o.estimatedValue)}</span>
                  <span>احتمال {o.probability || 0}٪</span>
                  <span>پیگیری: {dateFa(o.nextFollowUpAt)}</span>
                </div>
              </div>
            ))
          : <Empty text="فرصت فروشی ثبت نشده" />}
        </ListCard>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <ListCard
          icon={<CalendarClock size={19} />}
          title="تایم‌لاین فعالیت‌ها"
          action={onActivity}>
          {customer.activities?.length ?
            customer.activities.map((a) => (
              <div
                key={a.id}
                className="relative border-r-2 border-gray-100 pr-4 dark:border-gray-800">
                <span className="absolute -right-[5px] top-2 h-2 w-2 rounded-full bg-brand-500" />
                <div className="flex justify-between gap-3">
                  <b className="text-sm">{a.title}</b>
                  <span className="text-[11px] text-gray-400">
                    {dateFa(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-600">
                  {activityFa[a.type] || a.type}
                </p>
                {a.body && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {a.body}
                  </p>
                )}
              </div>
            ))
          : <Empty text="فعالیتی ثبت نشده" />}
        </ListCard>
        <ListCard icon={<Wrench size={19} />} title="آخرین پرونده‌های تعمیر">
          {customer.repairs?.length ?
            customer.repairs.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex justify-between">
                  <b>{r.deviceTitle}</b>
                  <span className="text-xs text-gray-500">{r.caseNumber}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {r.type} • {r.status} • {dateFa(r.createdAt)}
                </p>
              </div>
            ))
          : <Empty text="پرونده تعمیری ثبت نشده" />}
        </ListCard>
      </section>
    </div>
  );
}
function Metric({ title, value }: { title: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800/60">
      <span className="text-gray-500">{title}</span>
      <b>{value}</b>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
function ListCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: any;
  action?: () => void;
  children: any;
}) {
  return (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold">
          {icon}
          {title}
        </h3>
        {action && (
          <button
            onClick={action}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand-600">
            <Plus size={14} /> افزودن
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}


