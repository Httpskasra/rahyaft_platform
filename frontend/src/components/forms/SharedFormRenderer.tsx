"use client";
import React from 'react';
import type {SharedFormAnswers,SharedFormField,SharedFormSchema} from './schema';
export function SharedFormRenderer({schema,value,onChange,disabled=false}:{schema:SharedFormSchema;value:SharedFormAnswers;onChange:(v:SharedFormAnswers)=>void;disabled?:boolean}){
 const set=(k:string,v:string|number|boolean)=>onChange({...value,[k]:v});
 const field=(f:SharedFormField)=>{const base='w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900';
  if(f.type==='textarea') return <textarea className={base} rows={4} value={String(value[f.key]??'')} onChange={e=>set(f.key,e.target.value)} disabled={disabled}/>;
  if(f.type==='select') return <select className={base} value={String(value[f.key]??'')} onChange={e=>set(f.key,e.target.value)} disabled={disabled}><option value="">انتخاب کنید</option>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  if(f.type==='checkbox') return <input type="checkbox" checked={Boolean(value[f.key])} onChange={e=>set(f.key,e.target.checked)} disabled={disabled}/>;
  const type=f.type==='rating'?'number':f.type; return <input className={base} type={type} min={f.min} max={f.max} placeholder={f.placeholder} value={String(value[f.key]??'')} onChange={e=>set(f.key,(type==='number'?Number(e.target.value):e.target.value))} disabled={disabled}/>;
 };
 return <div className="space-y-6">{schema.title&&<div><h2 className="text-xl font-bold">{schema.title}</h2>{schema.description&&<p className="text-sm text-gray-500">{schema.description}</p>}</div>}{schema.sections.map((s,i)=><section key={i} className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"><h3 className="mb-1 font-semibold">{s.title}</h3>{s.description&&<p className="mb-4 text-sm text-gray-500">{s.description}</p>}<div className="grid gap-4 md:grid-cols-2">{s.fields.map(f=><label key={f.key} className={f.type==='textarea'?'md:col-span-2':''}><span className="mb-1.5 block text-sm font-medium">{f.label}{f.required&&<b className="text-red-500"> *</b>}</span>{field(f)}{f.helpText&&<small className="text-gray-500">{f.helpText}</small>}</label>)}</div></section>)}</div>;
}
