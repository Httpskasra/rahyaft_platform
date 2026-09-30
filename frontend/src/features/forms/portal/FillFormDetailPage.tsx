"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { formsApi, type Form } from "@/lib/api/forms";
import { SubmitFormPanel } from "@/features/forms/detail/submission";
import type { SchemaField } from "@/features/forms/detail/types";
export default function FillFormDetailPage({params}:{params:Promise<{id:string}>}){const {id}=use(params);const [form,setForm]=useState<Form|null>(null);const [loading,setLoading]=useState(true);const load=useCallback(()=>{setLoading(true);formsApi.findById(id).then(r=>setForm(r.data)).catch(()=>setForm(null)).finally(()=>setLoading(false))},[id]);useEffect(load,[load]);
if(loading)return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500"/></div>;if(!form)return <div className="py-20 text-center text-gray-500">فرم یافت نشد.</div>;
return <div dir="rtl" className="space-y-5"><Link href="/dashboard/forms/fill" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"><ArrowRight size={14}/> بازگشت به فرم‌ها</Link><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.name}</h1>{form.description&&<p className="mt-2 text-sm text-gray-500">{form.description}</p>}</div><SubmitFormPanel formId={form.id} fields={(form.schema?.fields??[]) as SchemaField[]} onSubmit={()=>{}}/></div>}
