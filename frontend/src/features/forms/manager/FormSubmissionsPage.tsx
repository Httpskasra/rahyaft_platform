"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formsApi, type DeepAnalysis } from "@/lib/api/forms";
import type { SchemaField } from "@/features/forms/detail/types";
import { SubmissionsTable } from "@/features/forms/detail/analytics/SubmissionsTable";
import { ApprovalStatusModal } from "@/features/forms/detail/approval";
import { FormManagerHeader } from "./FormManagerHeader";

export default function FormSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const [data,setData]=useState<DeepAnalysis|null>(null); const [loading,setLoading]=useState(true); const [query,setQuery]=useState(""); const [selected,setSelected]=useState<string|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{const r=await formsApi.getDeepAnalysis(id);setData(r.data)}catch{setData(null)}finally{setLoading(false)}},[id]); useEffect(()=>{load()},[load]);
  const filtered=useMemo(()=>{if(!data)return[];const q=query.trim().toLowerCase();if(!q)return data.submissions;return data.submissions.filter(s=>s.user?.name?.toLowerCase().includes(q)||s.user?.phoneNumber?.includes(q)||s.id.toLowerCase().includes(q)||Object.values(s.data).some(v=>String(v??"").toLowerCase().includes(q)))},[data,query]);
  if(loading)return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500"/></div>; if(!data)return <div className="py-20 text-center text-gray-500">اطلاعات فرم دریافت نشد.</div>;
  return <div className="space-y-5" dir="rtl">{selected&&<ApprovalStatusModal submissionId={selected} onClose={()=>setSelected(null)}/>}<FormManagerHeader form={{...data.form,_count:{submissions:data.submissionCount}} as any}/><div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-gray-900 dark:text-white">پاسخ‌های ثبت‌شده</h2><p className="mt-1 text-xs text-gray-400">{data.submissionCount} پاسخ برای این فرم</p></div><div className="relative w-full sm:w-80"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در پاسخ‌ها..." className="w-full rounded-xl border border-gray-200 bg-transparent py-2.5 pr-9 pl-3 text-sm dark:border-gray-700"/></div></div>{filtered.length===0?<div className="py-14 text-center text-sm text-gray-400">پاسخی پیدا نشد.</div>:<SubmissionsTable submissions={filtered} fields={(data.form.schema?.fields??[]) as SchemaField[]} onViewApproval={setSelected} formName={data.form.name} formCustomId={(data.form as any).customId} formDescription={data.form.description}/>}</div></div>
}
