/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  User,
  Phone,
  Building2,
  Plus,
  Check,
  X,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { customersApi, Gender, OccupationGroup, type Customer } from "@/lib/api/customers";
import Link from "next/link";
import { Spinner } from "../ui/Spinner";



const IR_PHONE_REGEX = /^09\d{9}$/;



// ─── Customer result row ──────────────────────────────────────
function CustomerRow({
  customer,
  onSelect,
}: {
  customer: Customer;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700 dark:hover:bg-brand-500/10"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <User size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
          {customer.firstName} {customer.lastName}
        </p>

        <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span dir="ltr" className="flex items-center gap-1">
            <Phone size={11} />
            {customer.mobile}
          </span>

          <span>
            {customer.city}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Quick create form ─────────────────────────────────────────
// function QuickCreateForm({
//   initialName,
//   initialPhone,
//   onCreated,
//   onCancel,
// }: {
//   initialName: string;
//   initialPhone: string;
//   onCreated: (customer: Customer) => void;
//   onCancel: () => void;
// }) {
// const [form, setForm] = useState({
//   firstName: "",
//   lastName: "",
//   mobile: initialPhone,
//   phone: "",
//   nationalCode: "",
//   birthDate: "",
//   gender: "MALE" as Gender,
//   province: "",
//   city: "",
//   address: "",
//   occupation: "",
//   occupationGroup: "OTHER" as OccupationGroup,
//   email: "",
//   postalCode: "",
// });
//   const [creating, setCreating] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleSubmit = async () => {
//     setError(null);
//     if (!form.firstName.trim()) {
//       setError("نام  الزامی است");
//       return;
//     }
//     if (!form.lastName.trim()) {
//       setError(" نام خانوادگی الزامی است");
//       return;
//     }
//     if (!IR_PHONE_REGEX.test(form.mobile.trim())) {
//       setError("شماره تلفن معتبر نیست (مثال: 09123456789)");
//       return;
//     }
//     if (form.nationalCode && !/^\d{10}$/.test(form.nationalCode.trim())) {
//       setError("کد ملی باید ۱۰ رقم باشد");
//       return;
//     }
//     setCreating(true);
//     try {
//       const { data } = await customersApi.create({
//         firstName: form.firstName.trim(),
//         lastName: form.lastName.trim(),
//         mobile: form.mobile.trim(),
//         phone: form.phone.trim(),
//         nationalCode: form.nationalCode.trim(),
//         birthDate: form.birthDate,
//         gender: form.gender,
//         province: form.province.trim(),
//         city: form.city.trim(),
//         address: form.address.trim(),
//         occupation: form.occupation.trim(),
//         occupationGroup: form.occupationGroup,
//         email: form.email || undefined,
//         postalCode: form.postalCode || undefined,
//       });
//       onCreated(data);
//     } catch (e: unknown) {
//       const msg =
//         (e as any)?.response?.data?.message ??
//         (e instanceof Error ? e.message : "خطا در ثبت مشتری");
//       setError(Array.isArray(msg) ? msg[0] : msg);
//     } finally {
//       setCreating(false);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
//         <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
//         <p className="text-xs text-amber-700 dark:text-amber-300">مشتری پیدا نشد، می‌توانید مشتری جدید ثبت کنید</p>
//       </div>

//       {error && (
//         <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-900/20">
//           <AlertCircle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
//           <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
//         </div>
//       )}

//       <div>
//         <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
//           نام و نام خانوادگی<span className="mr-0.5 text-red-500">*</span>
//         </label>
//         <input
//           autoFocus
//           type="text"
//           value={form.fullName}
//           onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
//           placeholder="مثلاً: علی محمدی"
//           className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
//         />
//       </div>

//       <div>
//         <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
//           شماره تلفن<span className="mr-0.5 text-red-500">*</span>
//         </label>
//         <input
//           type="text"
//           dir="ltr"
//           value={form.phoneNumber}
//           onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
//           placeholder="09xxxxxxxxx"
//           className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
//         />
//       </div>

//       <div className="grid grid-cols-2 gap-3">
//         <div>
//           <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">نام شرکت</label>
//           <input
//             type="text"
//             value={form.companyName}
//             onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
//             placeholder="اختیاری"
//             className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
//           />
//         </div>
//         <div>
//           <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">کد ملی</label>
//           <input
//             type="text"
//             dir="ltr"
//             value={form.nationalCode}
//             onChange={(e) => setForm((f) => ({ ...f, nationalCode: e.target.value }))}
//             placeholder="اختیاری"
//             className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
//           />
//         </div>
//       </div>

//       <div>
//         <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">آدرس</label>
//         <input
//           type="text"
//           value={form.address}
//           onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
//           placeholder="اختیاری"
//           className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
//         />
//       </div>

//       <div className="flex justify-end gap-2 pt-1">
//         <button
//           type="button"
//           onClick={onCancel}
//           className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
//         >
//           بازگشت به جستجو
//         </button>
//         <button
//           type="button"
//           onClick={handleSubmit}
//           disabled={creating}
//           className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
//         >
//           {creating ? <Spinner size={13} /> : <Check size={14} />}
//           ثبت مشتری
//         </button>
//       </div>
//     </div>
//   );
// }

// ─── Main Picker Modal ─────────────────────────────────────────
export function CustomerPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // const [mode, setMode] = useState<"search" | "create">("search");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setResults([]);
    setSearched(false);
    // setMode("search");
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { data } = await customersApi.findAll({ search: q || undefined, pageSize: 10 });
      setResults(data.items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(search.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  // const handleCreated = (customer: Customer) => {
  //   onSelect(customer);
  //   onClose();
  // };

  if (!open) return null;

  // پیش‌فرض ساخت سریع: اگر کاربر چیزی شبیه شماره تلفن تایپ کرده باشد در فیلد phone قرار می‌گیرد
  // const looksLikePhone = /^09\d*$/.test(search.trim());

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              انتخاب مشتری
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              نام، شماره تلفن یا کد ملی را جستجو کنید
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
<div className="flex-1 overflow-y-auto px-6 py-5">
  <div className="space-y-4">
    <div className="relative">
      <input
        autoFocus
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جستجو..."
        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder-gray-500"
      />
      <Search
        size={15}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>

    {loading ? (
      <div className="flex items-center justify-center py-10">
        <Spinner size={20} />
      </div>
    ) : results.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 py-10 text-center dark:border-gray-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <User size={20} className="text-gray-400" />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {searched ? "مشتری‌ای پیدا نشد" : "برای جستجو شروع به تایپ کنید"}
        </p>

        <Link
          href="/dashboard/customers"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <UserPlus size={14} />
          ثبت مشتری جدید
        </Link>
      </div>
    ) : (
      <div className="space-y-2">
        {results.map((customer) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            onSelect={() => {
              onSelect(customer);
              onClose();
            }}
          />
        ))}

        <Link
          href="/dashboard/customers"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600"
        >
          <Plus size={14} />
          ثبت مشتری جدید
        </Link>
      </div>
    )}
  </div>
</div>
      </div>
    </div>
  );
}