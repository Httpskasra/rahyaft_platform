/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { customersApi, type Customer, type CustomerDetail } from "@/lib/api/customers";
import { DetailPageHeader } from "@/components/ui/DetailPageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ActivityModal, ContactModal, CustomerModal, CustomerView, OpportunityModal } from "./components";
import { nameOf } from "./constants";

export default function CustomerDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [opportunityModal, setOpportunityModal] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const activeCustomerId = customer?.id;
  const toast = (type: "ok" | "err", text: string) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000); };
  const load = useCallback(async () => { setLoading(true); setError(null); try { const response = await customersApi.findOne(customerId); setCustomer(response.data); } catch { setError("مشتری موردنظر پیدا نشد یا دسترسی به آن امکان‌پذیر نیست"); } finally { setLoading(false); } }, [customerId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!activeCustomerId) return;
    let cancelled = false;
    const timer = setInterval(async () => { if (document.hidden) return; try { const response = await customersApi.latestAiAnalysis(activeCustomerId); if (!cancelled) setCustomer((current) => current ? { ...current, aiAnalyses: [response.data] } : current); } catch {} }, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeCustomerId]);
  const remove = async () => { if (!customer || !confirm(`مشتری «${nameOf(customer)}» حذف شود؟`)) return; try { await customersApi.remove(customer.id); router.push("/dashboard/customers"); } catch { toast("err", "حذف مشتری ناموفق بود"); } };

  return <div dir="rtl" lang="fa">
    {message && <div className={`fixed bottom-6 left-6 z-[100] rounded-xl px-4 py-3 text-sm text-white shadow-xl ${message.type === "ok" ? "bg-emerald-600" : "bg-red-600"}`}>{message.text}</div>}
    <DetailPageHeader backHref="/dashboard/customers" backLabel="بازگشت به فهرست مشتریان" title={customer ? nameOf(customer) : "جزئیات مشتری"} subtitle="نمای ۳۶۰ درجه مشتری، فروش، ارتباطات، تعمیرات و تحلیل هوش مصنوعی" />
    {loading ? <div className="flex justify-center py-24"><Spinner /></div> : error || !customer ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></div> : <CustomerView customer={customer} refresh={load} onEdit={() => setCustomerModal(true)} onDelete={() => void remove()} onContact={() => setContactModal(true)} onOpportunity={() => setOpportunityModal(true)} onActivity={() => setActivityModal(true)} />}
    {customer && <><CustomerModal open={customerModal} customer={customer as Customer} close={() => setCustomerModal(false)} done={() => { setCustomerModal(false); toast("ok", "اطلاعات مشتری به‌روزرسانی شد"); void load(); }} /><ContactModal open={contactModal} customerId={customer.id} close={() => setContactModal(false)} done={() => { setContactModal(false); toast("ok", "مخاطب اضافه شد"); void load(); }} /><OpportunityModal open={opportunityModal} customerId={customer.id} close={() => setOpportunityModal(false)} done={() => { setOpportunityModal(false); toast("ok", "فرصت فروش اضافه شد"); void load(); }} /><ActivityModal open={activityModal} customerId={customer.id} close={() => setActivityModal(false)} done={() => { setActivityModal(false); toast("ok", "فعالیت ثبت شد"); void load(); }} /></>}
  </div>;
}
