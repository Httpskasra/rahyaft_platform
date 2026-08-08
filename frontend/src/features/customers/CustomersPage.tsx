/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/immutability */
"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import {
  customersApi,
  type Customer,
  type CustomerDetail,
  type CustomerType,
} from "@/lib/api/customers";
import { Spinner } from "@/components/ui/Spinner";

import {
  card,
  input,
  nameOf,
  statusFa,
  typeFa,
} from "@/features/customers/constants";
import {
  ActivityModal,
  ContactModal,
  CustomerModal,
  CustomerView,
  OpportunityModal,
} from "@/features/customers/components";

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
