"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft, CalendarDays, CheckSquare, Copy, GripVertical, Hash, List, Loader2,
  Plus, Radio, Save, Table2, TextCursorInput, Trash2, Type, X,
} from "lucide-react";
import { formsApi, type Form, type FormField, type TableColumn } from "@/lib/api/forms";
import type { FieldDef, FieldType } from "@/features/forms/components/types";
import { FormManagerHeader } from "./FormManagerHeader";

const palette: Array<{ type: FieldType; label: string; icon: typeof Type }> = [
  { type: "text", label: "متن کوتاه", icon: TextCursorInput },
  { type: "textarea", label: "متن بلند", icon: AlignLeft },
  { type: "number", label: "عدد", icon: Hash },
  { type: "select", label: "لیست کشویی", icon: List },
  { type: "radio", label: "انتخاب تکی", icon: Radio },
  { type: "checkbox", label: "چند انتخابی", icon: CheckSquare },
  { type: "jalali_date", label: "تاریخ شمسی", icon: CalendarDays },
  { type: "table", label: "جدول", icon: Table2 },
];

const optionTypes: FieldType[] = ["select", "radio", "checkbox"];
const blankField = (type: FieldType): FieldDef => ({
  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  label: "فیلد جدید",
  description: "",
  required: false,
  options: optionTypes.includes(type) ? ["گزینه ۱", "گزینه ۲"] : [],
  columns: type === "table" ? [{ id: `col_${Date.now()}`, label: "ستون ۱", type: "text" }] : undefined,
});

function PreviewField({ field }: { field: FieldDef }) {
  const base = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900";
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {field.label || "بدون عنوان"}{field.required && <span className="mr-1 text-red-500">*</span>}
      </label>
      {field.description && <p className="text-xs text-gray-400">{field.description}</p>}
      {field.type === "textarea" ? <div className={`${base} h-20`}>پاسخ بلند...</div>
        : field.type === "select" ? <div className={base}>انتخاب کنید...</div>
        : field.type === "radio" || field.type === "checkbox" ? <div className="flex flex-wrap gap-3">{field.options.map((o, i) => <span key={i} className="text-xs text-gray-500">○ {o || `گزینه ${i + 1}`}</span>)}</div>
        : field.type === "table" ? <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"><div className="grid bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-800" style={{ gridTemplateColumns: `repeat(${Math.max(field.columns?.length ?? 1, 1)}, minmax(100px, 1fr))` }}>{(field.columns ?? []).map(c => <span key={c.id}>{c.label || "ستون"}</span>)}</div><div className="h-10 bg-white dark:bg-gray-900" /></div>
        : <div className={base}>{field.type === "jalali_date" ? "۱۴۰۵/۰۷/۰۸" : field.type === "number" ? "۰" : "پاسخ..."}</div>}
    </div>
  );
}

export default function FormBuilderPage({ params, mode = "edit" }: { params?: Promise<{ id: string }>; mode?: "create" | "edit" }) {
  const resolved = params ? use(params) : null;
  const id = resolved?.id;
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customId, setCustomId] = useState("");
  const [fields, setFields] = useState<FieldDef[]>(mode === "create" ? [blankField("text")] : []);
  const [selectedId, setSelectedId] = useState<string | null>(mode === "create" ? null : null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await formsApi.findById(id);
      setForm(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setCustomId(data.customId ?? "");
      const next = ((data.schema?.fields ?? []) as FormField[]).map((f) => ({ ...f, description: f.description ?? "", options: f.options ?? [] })) as FieldDef[];
      setFields(next);
      setSelectedId(next[0]?.id ?? null);
    } catch { setError("فرم یافت نشد"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (mode === "edit") load(); }, [load, mode]);

  const selected = useMemo(() => fields.find(f => f.id === selectedId) ?? null, [fields, selectedId]);
  const updateSelected = (patch: Partial<FieldDef>) => setFields(prev => prev.map(f => f.id === selectedId ? { ...f, ...patch } : f));
  const addField = (type: FieldType) => { const f = blankField(type); setFields(prev => [...prev, f]); setSelectedId(f.id); };
  const removeField = (fieldId: string) => { setFields(prev => prev.filter(f => f.id !== fieldId)); if (selectedId === fieldId) setSelectedId(null); };
  const duplicateField = (field: FieldDef) => { const copy = { ...field, id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: `${field.label} - کپی`, options: [...field.options], columns: field.columns?.map(c => ({ ...c, id: `col_${Date.now()}_${Math.random()}` })) }; setFields(prev => [...prev, copy]); setSelectedId(copy.id); };
  const dropOn = (targetId: string) => { if (!draggedId || draggedId === targetId) return; setFields(prev => { const from = prev.findIndex(f => f.id === draggedId); const to = prev.findIndex(f => f.id === targetId); if (from < 0 || to < 0) return prev; const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }); setDraggedId(null); };

  const save = async () => {
    setError("");
    if (!name.trim()) return setError("نام فرم الزامی است");
    if (!fields.length || fields.some(f => !f.label.trim())) return setError("حداقل یک فیلد معتبر با عنوان لازم است");
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, customId: customId.trim() || undefined, schema: { fields } };
      if (mode === "create") {
        const { data } = await formsApi.create(payload);
        router.replace(`/dashboard/forms/manage/${data.id}/builder`);
      } else if (id) {
        const { data } = await formsApi.update(id, payload);
        setForm(data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "ذخیره فرم با خطا مواجه شد");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

  return (
    <div className="space-y-5" dir="rtl">
      {mode === "edit" && form && <FormManagerHeader form={{ ...form, name, description, customId, schema: { fields } }} />}
      {mode === "create" && <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">ساخت فرم جدید</h1><p className="mt-1 text-sm text-gray-500">فیلدها را اضافه کنید، ترتیب بدهید و همزمان پیش‌نمایش را ببینید.</p></div>}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div><label className="mb-1 block text-xs font-medium text-gray-500">نام فرم</label><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700" placeholder="مثلاً فرم درخواست خرید" /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-500">شناسه فرم</label><input dir="ltr" value={customId} onChange={e => setCustomId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700" placeholder="FORM-001" /></div>
        </div>
        <div className="mt-3"><label className="mb-1 block text-xs font-medium text-gray-500">توضیحات</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700" /></div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_300px]">
        <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3"><h2 className="text-sm font-bold text-gray-900 dark:text-white">فیلدها</h2><p className="mt-1 text-xs text-gray-400">برای افزودن کلیک کنید</p></div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{palette.map(({ type, label, icon: Icon }) => <button key={type} onClick={() => addField(type)} className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2.5 text-right text-xs font-medium text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-blue-500/10"><Icon size={15} /> {label}<Plus size={12} className="mr-auto opacity-50" /></button>)}</div>
        </aside>

        <main className="min-h-[560px] rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 border-b border-gray-100 pb-4 dark:border-gray-800"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{name || "فرم بدون نام"}</h2>{description && <p className="mt-1 text-xs leading-6 text-gray-500">{description}</p>}</div>
            {fields.length === 0 ? <button onClick={() => addField("text")} className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700"><Plus className="mb-2" /> اولین فیلد را اضافه کنید</button>
              : <div className="space-y-3">{fields.map((field, index) => <div key={field.id} draggable onDragStart={() => setDraggedId(field.id)} onDragOver={e => e.preventDefault()} onDrop={() => dropOn(field.id)} onClick={() => setSelectedId(field.id)} className={`group relative cursor-pointer rounded-2xl border p-4 transition ${selectedId === field.id ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-100 dark:bg-blue-500/5 dark:ring-blue-900/40" : "border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800/40"}`}>
                <div className="absolute left-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100"><button onClick={e => { e.stopPropagation(); duplicateField(field); }} className="rounded-lg bg-white p-1.5 text-gray-400 shadow hover:text-blue-600 dark:bg-gray-800"><Copy size={13} /></button><button onClick={e => { e.stopPropagation(); removeField(field.id); }} className="rounded-lg bg-white p-1.5 text-gray-400 shadow hover:text-red-500 dark:bg-gray-800"><Trash2 size={13} /></button></div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300"><GripVertical size={16} /></div>
                <div className="pr-4"><PreviewField field={field} /></div>
                <span className="absolute bottom-1 left-2 text-[10px] text-gray-300">{index + 1}</span>
              </div>)}</div>}
          </div>
        </main>

        <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {!selected ? <div className="py-12 text-center text-sm text-gray-400">یک فیلد را انتخاب کنید تا تنظیمات آن نمایش داده شود.</div> : <div className="space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-gray-900 dark:text-white">تنظیمات فیلد</h2><p className="mt-1 text-[11px] text-gray-400">{selected.type}</p></div><button onClick={() => setSelectedId(null)} className="text-gray-400"><X size={16} /></button></div>
            <div><label className="mb-1 block text-xs text-gray-500">عنوان</label><input value={selected.label} onChange={e => updateSelected({ label: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">توضیح راهنما</label><textarea value={selected.description} onChange={e => updateSelected({ description: e.target.value })} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700" /></div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800"><span>فیلد اجباری</span><input type="checkbox" checked={selected.required} onChange={e => updateSelected({ required: e.target.checked })} className="h-4 w-4" /></label>
            {optionTypes.includes(selected.type) && <div><div className="mb-2 flex items-center justify-between"><label className="text-xs text-gray-500">گزینه‌ها</label><button onClick={() => updateSelected({ options: [...selected.options, `گزینه ${selected.options.length + 1}`] })} className="text-xs text-blue-600">+ افزودن</button></div><div className="space-y-2">{selected.options.map((o, i) => <div key={i} className="flex gap-1"><input value={o} onChange={e => updateSelected({ options: selected.options.map((x, j) => j === i ? e.target.value : x) })} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700" /><button onClick={() => updateSelected({ options: selected.options.filter((_, j) => j !== i) })} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></div>)}</div></div>}
            {selected.type === "table" && <TableColumnsEditor columns={selected.columns ?? []} onChange={columns => updateSelected({ columns })} />}
          </div>}
        </aside>
      </div>

      <div className="sticky bottom-4 z-20 flex justify-end"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{mode === "create" ? "ایجاد و ادامه" : "ذخیره تغییرات"}</button></div>
    </div>
  );
}

function TableColumnsEditor({ columns, onChange }: { columns: TableColumn[]; onChange: (columns: TableColumn[]) => void }) {
  const add = () => onChange([...columns, { id: `col_${Date.now()}_${Math.random()}`, label: `ستون ${columns.length + 1}`, type: "text" }]);
  return <div><div className="mb-2 flex items-center justify-between"><label className="text-xs text-gray-500">ستون‌های جدول</label><button onClick={add} className="text-xs text-blue-600">+ ستون</button></div><div className="space-y-2">{columns.map((col, i) => <div key={col.id} className="rounded-xl border border-gray-100 p-2 dark:border-gray-800"><div className="flex gap-1"><input value={col.label} onChange={e => onChange(columns.map((c, j) => j === i ? { ...c, label: e.target.value } : c))} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700" /><select value={col.type} onChange={e => onChange(columns.map((c, j) => j === i ? { ...c, type: e.target.value as TableColumn["type"] } : c))} className="rounded-lg border border-gray-200 bg-transparent px-1 text-xs dark:border-gray-700"><option value="text">متن</option><option value="number">عدد</option><option value="select">انتخابی</option></select><button onClick={() => onChange(columns.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></div>{col.type === "select" && <input value={(col.options ?? []).join(", ")} onChange={e => onChange(columns.map((c, j) => j === i ? { ...c, options: e.target.value.split(",").map(x => x.trim()).filter(Boolean) } : c))} className="mt-2 w-full rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-xs dark:border-gray-700" placeholder="گزینه‌ها با کاما جدا شوند" />}</div>)}</div></div>;
}
