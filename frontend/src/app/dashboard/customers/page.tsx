/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/immutability */
"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import {
  customersApi,
  type ActivityPayload,
  type ContactPayload,
  type Customer,
  type CustomerDetail,
  type CustomerPayload,
  type CustomerType,
  type OpportunityPayload,
} from "@/lib/api/customers";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";

const statusFa = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  BLACKLISTED: "مسدود",
} as const;
const typeFa = { PERSON: "حقیقی", ORGANIZATION: "سازمانی" } as const;
const occupationGroupOptions = [
  ["HAIR_TRANSPLANT_TECHNICIAN", "تکنسین کاشت مو"],
  ["NAIL_TECHNICIAN", "تکنسین کاشت ناخن"],
  ["GENERAL_PRACTITIONER", "پزشک عمومی"],
  ["PHYSICIAN", "پزشک"],
  ["HAIR_BEAUTY_CLINIC", "کلینیک کاشت مو و زیبایی"],
  ["HOME_DEVICE_CUSTOMER", "مشتری دستگاه خانگی"],
  ["BARBER", "آرایشگر"],
  ["DENTIST", "دندانپزشک"],
  ["VETERINARIAN", "دامپزشک"],
  ["COLLEAGUE", "همکار"],
  ["EMPLOYEE", "کارمند"],
  ["DERMATOLOGIST", "متخصص پوست و مو"],
  ["GYNECOLOGIST", "متخصص زنان"],
  ["OTHER", "سایر"],
] as const;
const oppStatusFa: Record<string, string> = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته‌شده",
  NEEDS_QUOTE: "نیازمند پیش‌فاکتور",
  QUOTED: "پیش‌فاکتور ارسال‌شده",
  NEGOTIATION: "مذاکره",
  WON: "موفق",
  LOST: "از دست رفته",
  CANCELED: "لغو شده",
};
const activityFa: Record<string, string> = {
  NOTE: "یادداشت",
  CALL: "تماس",
  SMS: "پیامک",
  VISIT: "ملاقات",
  FOLLOW_UP: "پیگیری",
  CUSTOMER_CREATED: "ایجاد مشتری",
  CUSTOMER_UPDATED: "ویرایش مشتری",
  CONTACT_CREATED: "ایجاد مخاطب",
  CONTACT_UPDATED: "ویرایش مخاطب",
  CONTACT_DELETED: "حذف مخاطب",
  SALES_OPPORTUNITY_CREATED: "ایجاد فرصت فروش",
  SALES_OPPORTUNITY_UPDATED: "ویرایش فرصت فروش",
  SALES_OPPORTUNITY_DELETED: "حذف فرصت فروش",
  REPAIR_CREATED: "ایجاد تعمیر",
  REPAIR_STATUS_CHANGED: "تغییر وضعیت تعمیر",
  AI_ANALYSIS_UPDATED: "تحلیل AI",
};
const nameOf = (c: Customer) =>
  c.type === "ORGANIZATION" ?
    c.organizationName || "سازمان بدون نام"
  : `${c.firstName || ""} ${c.lastName || ""}`.trim();
const dateFa = (v?: string | null) =>
  v ?
    new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
      new Date(v),
    )
  : "—";
const money = (v?: string | number | null) =>
  v ? `${Number(v).toLocaleString("fa-IR")} تومان` : "—";
const card =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const input =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800";

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]),
    [selected, setSelected] = useState<CustomerDetail | null>(null),
    [loading, setLoading] = useState(true),
    [detailLoading, setDetailLoading] = useState(false),
    [search, setSearch] = useState(""),
    [type, setType] = useState<"" | CustomerType>(""),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [message, setMessage] = useState<{
      type: "ok" | "err";
      text: string;
    } | null>(null),
    [customerModal, setCustomerModal] = useState(false),
    [contactModal, setContactModal] = useState(false),
    [oppModal, setOppModal] = useState(false),
    [activityModal, setActivityModal] = useState(false),
    [editing, setEditing] = useState<Customer | null>(null);
  const toast = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await customersApi.findAll({
        search: search || undefined,
        type,
        page,
        pageSize: 20,
      });
      setItems(r.data.items);
      setPages(r.data.meta.totalPages || 1);
      if (!selected && r.data.items[0]) open(r.data.items[0].id);
    } catch {
      toast("err", "دریافت لیست مشتریان ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [search, type, page]);
  const open = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await customersApi.findOne(id);
      setSelected(r.data);
    } catch {
      toast("err", "دریافت جزئیات مشتری ناموفق بود");
    } finally {
      setDetailLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);
  const refresh = () => selected && open(selected.id);
  const remove = async () => {
    if (!selected || !confirm(`مشتری «${nameOf(selected)}» حذف شود؟`)) return;
    try {
      await customersApi.remove(selected.id);
      setSelected(null);
      toast("ok", "مشتری حذف شد");
      load();
    } catch {
      toast("err", "حذف مشتری ناموفق بود");
    }
  };
  return (
    <div dir="rtl" className="space-y-5">
      {message && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-xl ${message.type === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>
          {message.type === "ok" ?
            <Check size={16} />
          : <AlertCircle size={16} />}{" "}
          {message.text}
        </div>
      )}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            CRM و مدیریت مشتریان
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            نمای ۳۶۰ درجه مشتری، فروش، ارتباطات، تعمیرات و تحلیل هوش مصنوعی
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setCustomerModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">
          <Plus size={17} /> مشتری جدید
        </button>
      </div>
      <div className="grid min-h-[720px] gap-5 xl:grid-cols-[340px_1fr]">
        <aside className={`${card} overflow-hidden`}>
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="relative">
              <Search
                className="absolute right-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="نام، موبایل، کد ملی یا سازمان..."
                className={`${input} pr-10`}
              />
            </div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as any);
                setPage(1);
              }}
              className={`${input} mt-3`}>
              <option value="">همه مشتریان</option>
              <option value="PERSON">اشخاص حقیقی</option>
              <option value="ORGANIZATION">سازمان‌ها و کلینیک‌ها</option>
            </select>
          </div>
          <div className="max-h-[610px] space-y-2 overflow-y-auto p-3">
            {loading ?
              <div className="py-16">
                <Spinner />
              </div>
            : items.length === 0 ?
              <div className="py-16 text-center text-sm text-gray-500">
                مشتری‌ای یافت نشد
              </div>
            : items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className={`w-full rounded-xl border p-3 text-right transition ${selected?.id === c.id ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"}`}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100 dark:bg-gray-800">
                      {c.type === "ORGANIZATION" ?
                        <Building2 size={19} />
                      : <UserRound size={19} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {nameOf(c)}
                      </p>
                      <p
                        dir="ltr"
                        className="mt-1 text-right text-xs text-gray-500">
                        {c.mobile || c.phone || "بدون شماره تماس"}
                      </p>
                    </div>
                    <ChevronLeft size={16} className="text-gray-400" />
                  </div>
                  <div className="mt-2 flex gap-1.5 text-[11px]">
                    <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800">
                      {typeFa[c.type]}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800">
                      {statusFa[c.status]}
                    </span>
                    {c.city && (
                      <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800">
                        {c.city}
                      </span>
                    )}
                  </div>
                </button>
              ))
            }
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 p-3 text-xs dark:border-gray-800">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border p-2 disabled:opacity-40">
              <ChevronRight size={15} />
            </button>
            <span>
              صفحه {page} از {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border p-2 disabled:opacity-40">
              <ChevronLeft size={15} />
            </button>
          </div>
        </aside>
        <main>
          {detailLoading ?
            <div className={`${card} grid h-full place-items-center`}>
              <Spinner />
            </div>
          : !selected ?
            <div
              className={`${card} grid h-full place-items-center text-gray-500`}>
              یک مشتری را انتخاب کنید
            </div>
          : <CustomerView
              customer={selected}
              refresh={refresh}
              onEdit={() => {
                setEditing(selected);
                setCustomerModal(true);
              }}
              onDelete={remove}
              onContact={() => setContactModal(true)}
              onOpportunity={() => setOppModal(true)}
              onActivity={() => setActivityModal(true)}
            />
          }
        </main>
      </div>
      <CustomerModal
        open={customerModal}
        customer={editing}
        close={() => setCustomerModal(false)}
        done={() => {
          setCustomerModal(false);
          toast(
            "ok",
            editing ? "اطلاعات مشتری بروزرسانی شد" : "مشتری ایجاد شد",
          );
          load();
          refresh();
        }}
      />
      {selected && (
        <>
          <ContactModal
            open={contactModal}
            customerId={selected.id}
            close={() => setContactModal(false)}
            done={() => {
              setContactModal(false);
              toast("ok", "مخاطب اضافه شد");
              refresh();
            }}
          />
          <OpportunityModal
            open={oppModal}
            customerId={selected.id}
            close={() => setOppModal(false)}
            done={() => {
              setOppModal(false);
              toast("ok", "فرصت فروش اضافه شد");
              refresh();
            }}
          />
          <ActivityModal
            open={activityModal}
            customerId={selected.id}
            close={() => setActivityModal(false)}
            done={() => {
              setActivityModal(false);
              toast("ok", "فعالیت ثبت شد");
              refresh();
            }}
          />
        </>
      )}
    </div>
  );
}

function CustomerView({
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

function CustomerModal({
  open,
  customer,
  close,
  done,
}: {
  open: boolean;
  customer: Customer | null;
  close: () => void;
  done: () => void;
}) {
  const [form, setForm] = useState<CustomerPayload>({
      type: "PERSON",
      status: "ACTIVE",
    }),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm(customer ? { ...customer } : { type: "PERSON", status: "ACTIVE" });
  }, [customer, open]);
  const set = (k: string, v: any) =>
    setForm((p) => ({ ...p, [k]: v || undefined }));
  const save = async () => {
    setSaving(true);
    try {
      customer ?
        await customersApi.update(customer.id, form)
      : await customersApi.create(form);
      done();
    } catch {
      alert("اطلاعات فرم یا مقادیر یکتا را بررسی کنید");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={customer ? "ویرایش مشتری" : "ثبت مشتری جدید"}
      maxWidth="max-w-3xl"
      bodyClassName="max-h-[75vh] overflow-y-auto">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="نوع مشتری">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={input}>
            <option value="PERSON">حقیقی</option>
            <option value="ORGANIZATION">سازمانی</option>
          </select>
        </Field>
        <Field label="وضعیت">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={input}>
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="BLACKLISTED">مسدود</option>
          </select>
        </Field>
        {form.type === "PERSON" ?
          <>
            <Input
              label="نام"
              value={form.firstName}
              set={(v) => set("firstName", v)}
            />
            <Input
              label="نام خانوادگی"
              value={form.lastName}
              set={(v) => set("lastName", v)}
            />
            <Input
              label="کد ملی"
              value={form.nationalCode}
              set={(v) => set("nationalCode", v)}
            />
            <Field label="تاریخ تولد">
              <PersianDatePicker
                value={form.birthDate}
                valueMode="jalali"
                onChange={(v) => set("birthDate", v)}
                placeholder="انتخاب تاریخ تولد"
                className={input}
              />
            </Field>
            <Field label="جنسیت">
              <select
                value={form.gender || ""}
                onChange={(e) => set("gender", e.target.value)}
                className={input}>
                <option value="">انتخاب کنید</option>
                <option value="MALE">مرد</option>
                <option value="FEMALE">زن</option>
              </select>
            </Field>
          </>
        : <>
            <Input
              label="نام سازمان/کلینیک"
              value={form.organizationName}
              set={(v) => set("organizationName", v)}
            />
            <Input
              label="شناسه ملی"
              value={form.nationalId}
              set={(v) => set("nationalId", v)}
            />
            <Input
              label="کد اقتصادی"
              value={form.economicCode}
              set={(v) => set("economicCode", v)}
            />
            <Input
              label="شماره ثبت"
              value={form.registrationNo}
              set={(v) => set("registrationNo", v)}
            />
          </>
        }
        <Input
          label="موبایل"
          value={form.mobile}
          set={(v) => set("mobile", v)}
        />
        <Input label="تلفن" value={form.phone} set={(v) => set("phone", v)} />
        <Input label="ایمیل" value={form.email} set={(v) => set("email", v)} />
        <Input
          label="استان"
          value={form.province}
          set={(v) => set("province", v)}
        />
        <Input label="شهر" value={form.city} set={(v) => set("city", v)} />
        <Input
          label="عنوان شغل / حوزه فعالیت"
          value={form.occupation}
          set={(v) => set("occupation", v)}
        />
        <Field label="گروه شغلی">
          <select
            value={form.occupationGroup || ""}
            onChange={(e) => set("occupationGroup", e.target.value)}
            className={input}>
            <option value="">انتخاب کنید</option>
            {occupationGroupOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Input
            label="آدرس"
            value={form.address}
            set={(v) => set("address", v)}
          />
        </div>
      </div>
      <Actions close={close} save={save} saving={saving} />
    </Modal>
  );
}
function ContactModal({
  open,
  customerId,
  close,
  done,
}: {
  open: boolean;
  customerId: string;
  close: () => void;
  done: () => void;
}) {
  const [f, setF] = useState<ContactPayload>({ fullName: "" });
  return (
    <SimpleModal
      open={open}
      title="افزودن مخاطب سازمانی"
      close={close}
      save={async () => {
        await customersApi.createContact(customerId, f);
        setF({ fullName: "" });
        done();
      }}>
      <Input
        label="نام و نام خانوادگی"
        value={f.fullName}
        set={(v) => setF({ ...f, fullName: v })}
      />
      <Input label="سمت" value={f.role} set={(v) => setF({ ...f, role: v })} />
      <Input
        label="موبایل"
        value={f.mobile}
        set={(v) => setF({ ...f, mobile: v })}
      />
      <Input
        label="ایمیل"
        value={f.email}
        set={(v) => setF({ ...f, email: v })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!f.isPrimary}
          onChange={(e) => setF({ ...f, isPrimary: e.target.checked })}
        />{" "}
        مخاطب اصلی
      </label>
    </SimpleModal>
  );
}
function OpportunityModal({
  open,
  customerId,
  close,
  done,
}: {
  open: boolean;
  customerId: string;
  close: () => void;
  done: () => void;
}) {
  const [f, setF] = useState<OpportunityPayload>({
    title: "",
    status: "NEW",
    priority: "MEDIUM",
    probability: 0,
  });
  return (
    <SimpleModal
      open={open}
      title="فرصت فروش جدید"
      close={close}
      save={async () => {
        await customersApi.createOpportunity(customerId, f);
        setF({ title: "", status: "NEW", priority: "MEDIUM", probability: 0 });
        done();
      }}>
      <Input
        label="عنوان"
        value={f.title}
        set={(v) => setF({ ...f, title: v })}
      />
      <Field label="وضعیت فرصت فروش">
        <select
          value={f.status || "NEW"}
          onChange={(e) => setF({ ...f, status: e.target.value as OpportunityPayload["status"] })}
          className={input}>
          <option value="NEW">جدید</option>
          <option value="CONTACTED">تماس گرفته‌شده</option>
          <option value="NEEDS_QUOTE">نیازمند پیش‌فاکتور</option>
          <option value="QUOTED">پیش‌فاکتور ارسال‌شده</option>
          <option value="NEGOTIATION">مذاکره</option>
          <option value="WON">موفق</option>
          <option value="LOST">از دست رفته</option>
          <option value="CANCELED">لغو شده</option>
        </select>
      </Field>
      <Field label="اولویت">
        <select
          value={f.priority || "MEDIUM"}
          onChange={(e) => setF({ ...f, priority: e.target.value as OpportunityPayload["priority"] })}
          className={input}>
          <option value="LOW">کم</option>
          <option value="MEDIUM">متوسط</option>
          <option value="HIGH">زیاد</option>
          <option value="URGENT">فوری</option>
        </select>
      </Field>
      <Input
        label="مبلغ تخمینی"
        value={f.estimatedValue?.toString()}
        set={(v) => setF({ ...f, estimatedValue: Number(v) })}
      />
      <Input
        label="احتمال فروش (۰ تا ۱۰۰)"
        value={f.probability?.toString()}
        set={(v) => setF({ ...f, probability: Number(v) })}
      />
      <Field label="تاریخ احتمالی نهایی‌شدن فروش">
        <PersianDatePicker
          value={f.expectedCloseAt}
          valueMode="iso"
          onChange={(v) => setF({ ...f, expectedCloseAt: v || undefined })}
          placeholder="انتخاب تاریخ نهایی‌شدن"
          className={input}
        />
      </Field>
      <Field label="تاریخ پیگیری بعدی">
        <PersianDatePicker
          value={f.nextFollowUpAt}
          valueMode="iso"
          withTime
          onChange={(v) => setF({ ...f, nextFollowUpAt: v || undefined })}
          placeholder="انتخاب تاریخ و ساعت پیگیری"
          className={input}
        />
      </Field>
    </SimpleModal>
  );
}
function ActivityModal({
  open,
  customerId,
  close,
  done,
}: {
  open: boolean;
  customerId: string;
  close: () => void;
  done: () => void;
}) {
  const [f, setF] = useState<ActivityPayload>({ type: "NOTE", title: "" });
  return (
    <SimpleModal
      open={open}
      title="ثبت فعالیت"
      close={close}
      save={async () => {
        await customersApi.createActivity(customerId, f);
        setF({ type: "NOTE", title: "" });
        done();
      }}>
      <Field label="نوع">
        <select
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value as any })}
          className={input}>
          <option value="NOTE">یادداشت</option>
          <option value="CALL">تماس</option>
          <option value="SMS">پیامک</option>
          <option value="VISIT">ملاقات</option>
          <option value="FOLLOW_UP">پیگیری</option>
        </select>
      </Field>
      <Input
        label="عنوان"
        value={f.title}
        set={(v) => setF({ ...f, title: v })}
      />
      <Input label="شرح" value={f.body} set={(v) => setF({ ...f, body: v })} />
    </SimpleModal>
  );
}
function SimpleModal({
  open,
  title,
  close,
  save,
  children,
}: {
  open: boolean;
  title: string;
  close: () => void;
  save: () => Promise<void>;
  children: any;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={close} title={title} maxWidth="max-w-lg">
      <div className="space-y-4">{children}</div>
      <Actions
        close={close}
        save={async () => {
          setSaving(true);
          try {
            await save();
          } catch {
            alert("ثبت اطلاعات ناموفق بود");
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
      />
    </Modal>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-gray-600 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}
function Input({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value?: any;
  set: (v: string) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => set(e.target.value)}
        className={input}
      />
    </Field>
  );
}
function Actions({
  close,
  save,
  saving,
}: {
  close: () => void;
  save: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button onClick={close} className="rounded-xl border px-4 py-2 text-sm">
        انصراف
      </button>
      <button
        disabled={saving}
        onClick={save}
        className="rounded-xl bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50">
        {saving ? "در حال ذخیره..." : "ذخیره"}
      </button>
    </div>
  );
}
