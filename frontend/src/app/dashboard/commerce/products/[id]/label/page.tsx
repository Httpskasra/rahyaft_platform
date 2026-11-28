"use client";
import { use, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { commerceApi } from "@/lib/api/commerce";
import { errorMessage } from "@/features/commerce/constants";
import { buttonPrimary, Loading, SectionHeader } from "@/features/commerce/components/CommerceShell";

export default function ProductLabelPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params); const [html,setHtml]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{commerceApi.products.labelPrint(id).then(r=>setHtml(r.data)).catch(e=>setError(errorMessage(e,"دریافت لیبل ناموفق بود")))},[id]);
  return <div className="space-y-4"><SectionHeader title="پیش‌نمایش لیبل کالا" description="لیبل شامل QR، بارکد Code128، نام و کد ۹ رقمی کالا است." action={<button className={buttonPrimary} disabled={!html} onClick={()=>document.querySelector<HTMLIFrameElement>("#product-label-frame")?.contentWindow?.print()}><Printer size={17}/>چاپ لیبل</button>}/>{error&&<div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}{!html&&!error?<Loading/>:<iframe id="product-label-frame" title="لیبل کالا" srcDoc={html} className="h-[600px] w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700"/>}</div>
}
