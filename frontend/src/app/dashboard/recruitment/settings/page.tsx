"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  CheckCircle2,
  BriefcaseBusiness,
  FileText,
  Trash2,
} from "lucide-react";
import {
  recruitmentApi,
  type RecruitmentFormTemplate,
  type RecruitmentFormType,
  type RecruitmentJob,
} from "@/lib/api/recruitment";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import { SharedFormRenderer } from "@/components/forms/SharedFormRenderer";
import type {
  SharedFormField,
  SharedFormSchema,
} from "@/components/forms/schema";

const emptySchema: SharedFormSchema = {
  title: "فرم جدید",
  description: "",
  sections: [{ title: "اطلاعات", fields: [] }],
};
const typeLabels: Record<RecruitmentFormType, string> = {
  PRE_INTERVIEW: "فرم پیش از مصاحبه",
  INITIAL_INTERVIEW: "ارزیابی مصاحبه اولیه",
  TECHNICAL_INTERVIEW: "ارزیابی مصاحبه فنی",
  SUPERADMIN_REVIEW: "بررسی نهایی",
  PROFILE_COMPLETION: "تکمیل پروفایل",
};
const input =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900";
const button =
  "rounded-xl px-4 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export default function RecruitmentSettingsPage() {
  const [tab, setTab] = useState<"forms" | "jobs">("forms");
  const [forms, setForms] = useState<RecruitmentFormTemplate[]>([]);
  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<RecruitmentFormTemplate | null>(null);
  const [formMeta, setFormMeta] = useState<{
    name: string;
    description: string;
    type: RecruitmentFormType;
  }>({ name: "", description: "", type: "PRE_INTERVIEW" });
  const [schema, setSchema] = useState<SharedFormSchema>(emptySchema);
  const [preview, setPreview] = useState(false);
  const [job, setJob] = useState<any>({
    title: "",
    slug: "",
    description: "",
    departmentId: "",
    preInterviewFormId: "",
    initialInterviewFormId: "",
    technicalInterviewFormId: "",
    initialReviewerRoleId: "",
  });
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [f, j, d, r] = await Promise.all([
        recruitmentApi.adminForms(),
        recruitmentApi.adminJobs(),
        departmentsApi.findAll(),
        rolesApi.findAll(),
      ]);
      setForms(f);
      setJobs(j);
      setDepartments(d.data ?? d);
      setRoles(r.data ?? r);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e.message ?? "خطا در دریافت اطلاعات",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const published = (f?: RecruitmentFormTemplate | null) =>
    f?.versions?.find((v) => v.isPublished);
  const byType = (type: RecruitmentFormType) =>
    forms.filter((f) => f.type === type);
  const slugify = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const notify = (v: string) => {
    setMessage(v);
    setTimeout(() => setMessage(""), 3500);
  };
  const openNewForm = () => {
    setEditingTemplate(null);
    setFormMeta({ name: "", description: "", type: "PRE_INTERVIEW" });
    setSchema(structuredClone(emptySchema));
    setPreview(false);
    setShowFormEditor(true);
  };
  const openNewVersion = (f: RecruitmentFormTemplate) => {
    setEditingTemplate(f);
    setFormMeta({
      name: f.name,
      description: f.description ?? "",
      type: f.type,
    });
    setSchema(structuredClone(f.versions[0]?.schema ?? emptySchema));
    setPreview(false);
    setShowFormEditor(true);
  };
  const addSection = () =>
    setSchema({
      ...schema,
      sections: [
        ...schema.sections,
        { title: "بخش جدید", description: "", fields: [] },
      ],
    });
  const updateSection = (
    index: number,
    key: "title" | "description",
    value: string,
  ) =>
    setSchema({
      ...schema,
      sections: schema.sections.map((s, i) =>
        i === index ? { ...s, [key]: value } : s,
      ),
    });
  const removeSection = (index: number) =>
    setSchema({
      ...schema,
      sections: schema.sections.filter((_, i) => i !== index),
    });
  const addField = (sectionIndex: number) => {
    const field: SharedFormField = {
      key: `field_${Date.now()}`,
      label: "فیلد جدید",
      type: "text",
      required: false,
    };
    setSchema({
      ...schema,
      sections: schema.sections.map((s, i) =>
        i === sectionIndex ? { ...s, fields: [...s.fields, field] } : s,
      ),
    });
  };
  const updateField = (
    si: number,
    fi: number,
    patch: Partial<SharedFormField>,
  ) =>
    setSchema({
      ...schema,
      sections: schema.sections.map((s, i) =>
        i === si ?
          {
            ...s,
            fields: s.fields.map((f, j) => (j === fi ? { ...f, ...patch } : f)),
          }
        : s,
      ),
    });
  const removeField = (si: number, fi: number) =>
    setSchema({
      ...schema,
      sections: schema.sections.map((s, i) =>
        i === si ? { ...s, fields: s.fields.filter((_, j) => j !== fi) } : s,
      ),
    });
  const saveForm = async () => {
    setError("");
    if (!formMeta.name.trim()) return setError("نام فرم الزامی است");
    if (!schema.sections.some((s) => s.fields.length))
      return setError("حداقل یک فیلد به فرم اضافه کنید");
    try {
      if (editingTemplate)
        await recruitmentApi.createFormVersion(editingTemplate.id, schema);
      else await recruitmentApi.createForm({ ...formMeta, schema });
      notify(
        editingTemplate ? "نسخه جدید فرم ساخته شد" : "فرم استخدام ساخته شد",
      );
      setShowFormEditor(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    }
  };
  const publish = async (id: string) => {
    if (!confirm("این نسخه منتشر شود؟ نسخه منتشرشده قبلی غیرفعال خواهد شد."))
      return;
    try {
      await recruitmentApi.publishFormVersion(id);
      notify("نسخه فرم منتشر شد");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    }
  };
  const resetJob = () => {
    setEditingJobId(null);
    setJob({
      title: "",
      slug: "",
      description: "",
      departmentId: "",
      preInterviewFormId: "",
      initialInterviewFormId: "",
      technicalInterviewFormId: "",
      initialReviewerRoleId: "",
    });
  };
  const editJob = (j: RecruitmentJob) => {
    setEditingJobId(j.id);
    setJob({
      title: j.title,
      slug: j.slug,
      description: j.description ?? "",
      departmentId: j.departmentId ?? "",
      preInterviewFormId: j.preInterviewFormId,
      initialInterviewFormId: j.initialInterviewFormId ?? "",
      technicalInterviewFormId: j.technicalInterviewFormId ?? "",
      initialReviewerRoleId: j.initialReviewerRoleId ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveJob = async () => {
    setError("");
    if (!job.title || !job.slug || !job.preInterviewFormId)
      return setError("عنوان، نامک و فرم پیش از مصاحبه الزامی است");
    const payload = {
      ...job,
      departmentId: job.departmentId || undefined,
      initialInterviewFormId: job.initialInterviewFormId || undefined,
      technicalInterviewFormId: job.technicalInterviewFormId || undefined,
      initialReviewerRoleId: job.initialReviewerRoleId || undefined,
    };
    try {
      editingJobId ?
        await recruitmentApi.updateJob(editingJobId, payload)
      : await recruitmentApi.createJob(payload);
      notify(editingJobId ? "موقعیت شغلی ویرایش شد" : "موقعیت شغلی ساخته شد");
      resetJob();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    }
  };
  const toggleJob = async (j: RecruitmentJob) => {
    try {
      await recruitmentApi.updateJob(j.id, { isActive: !j.isActive });
      notify(j.isActive ? "موقعیت غیرفعال شد" : "موقعیت فعال شد");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message);
    }
  };
  if (loading)
    return (
      <div dir="rtl" className="p-6">
        در حال بارگذاری...
      </div>
    );
  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">تنظیمات استخدام</h1>
          <p className="text-sm text-gray-500">
            فرم‌ها و فرصت‌های شغلی را از این بخش مدیریت کنید.
          </p>
        </div>
        <Link href="/dashboard/recruitment" className={`${button} border`}>
          بازگشت به پرونده‌ها
        </Link>
      </div>
      {(error || message) && (
        <div
          className={`rounded-xl border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {error || message}
        </div>
      )}
      <div className="flex gap-2 rounded-2xl border bg-white p-2 dark:bg-gray-900">
        <button
          className={`${button} ${tab === "forms" ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          onClick={() => setTab("forms")}>
          <FileText className="ml-2 inline" size={18} />
          فرم‌های استخدام
        </button>
        <button
          className={`${button} ${tab === "jobs" ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          onClick={() => setTab("jobs")}>
          <BriefcaseBusiness className="ml-2 inline" size={18} />
          فرصت‌های شغلی
        </button>
      </div>
      {tab === "forms" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={openNewForm}
              className={`${button} bg-indigo-600 text-white`}>
              <Plus className="ml-2 inline" size={18} />
              ساخت فرم جدید
            </button>
          </div>
          {showFormEditor && (
            <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingTemplate ?
                    `نسخه جدید ${editingTemplate.name}`
                  : "ساخت فرم استخدام"}
                </h2>
                <button
                  onClick={() => setPreview(!preview)}
                  className={`${button} border`}>
                  <Eye className="ml-2 inline" size={17} />
                  {preview ? "ویرایش" : "پیش‌نمایش"}
                </button>
              </div>
              {!editingTemplate && (
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <label>
                    نام فرم
                    <input
                      className={input}
                      value={formMeta.name}
                      onChange={(e) =>
                        setFormMeta({ ...formMeta, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    نوع فرم
                    <select
                      className={input}
                      value={formMeta.type}
                      onChange={(e) =>
                        setFormMeta({
                          ...formMeta,
                          type: e.target.value as RecruitmentFormType,
                        })
                      }>
                      {Object.entries(typeLabels).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    توضیحات
                    <input
                      className={input}
                      value={formMeta.description}
                      onChange={(e) =>
                        setFormMeta({
                          ...formMeta,
                          description: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              )}
              {preview ?
                <SharedFormRenderer
                  schema={schema}
                  value={{}}
                  onChange={() => {}}
                />
              : <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      عنوان نمایشی فرم
                      <input
                        className={input}
                        value={schema.title ?? ""}
                        onChange={(e) =>
                          setSchema({ ...schema, title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      توضیح فرم
                      <input
                        className={input}
                        value={schema.description ?? ""}
                        onChange={(e) =>
                          setSchema({ ...schema, description: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  {schema.sections.map((section, si) => (
                    <div key={si} className="rounded-2xl border p-4">
                      <div className="mb-4 flex flex-wrap gap-3">
                        <input
                          className={input}
                          value={section.title ?? ""}
                          onChange={(e) =>
                            updateSection(si, "title", e.target.value)
                          }
                          placeholder="عنوان بخش"
                        />
                        <input
                          className={input}
                          value={section.description ?? ""}
                          onChange={(e) =>
                            updateSection(si, "description", e.target.value)
                          }
                          placeholder="توضیح بخش"
                        />
                        <button
                          className="text-red-600"
                          onClick={() => removeSection(si)}
                          type="button">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {section.fields.map((field, fi) => (
                          <div
                            key={fi}
                            className="grid gap-3 rounded-xl bg-gray-50 p-3 md:grid-cols-6 dark:bg-gray-800">
                            <input
                              className={input}
                              value={field.label}
                              onChange={(e) =>
                                updateField(si, fi, { label: e.target.value })
                              }
                              placeholder="عنوان"
                            />
                            <input
                              className={input}
                              value={field.key}
                              onChange={(e) =>
                                updateField(si, fi, {
                                  key: e.target.value.replace(/\s+/g, "_"),
                                })
                              }
                              placeholder="کلید"
                            />
                            <select
                              className={input}
                              value={field.type}
                              onChange={(e) =>
                                updateField(si, fi, {
                                  type: e.target.value as any,
                                })
                              }>
                              {[
                                "text",
                                "textarea",
                                "number",
                                "email",
                                "tel",
                                "date",
                                "select",
                                "checkbox",
                                "rating",
                              ].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <input
                              className={input}
                              value={field.placeholder ?? ""}
                              onChange={(e) =>
                                updateField(si, fi, {
                                  placeholder: e.target.value,
                                })
                              }
                              placeholder="Placeholder"
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!field.required}
                                onChange={(e) =>
                                  updateField(si, fi, {
                                    required: e.target.checked,
                                  })
                                }
                              />
                              الزامی
                            </label>
                            <button
                              className="text-red-600"
                              onClick={() => removeField(si, fi)}
                              type="button">
                              <Trash2 size={18} />
                            </button>
                            {field.type === "select" && (
                              <textarea
                                className={`${input} md:col-span-6`}
                                value={(field.options ?? [])
                                  .map((o) => `${o.label}|${o.value}`)
                                  .join("\n")}
                                onChange={(e) =>
                                  updateField(si, fi, {
                                    options: e.target.value
                                      .split("\n")
                                      .filter(Boolean)
                                      .map((line) => {
                                        const [label, value] = line.split("|");
                                        return {
                                          label: label?.trim(),
                                          value: (value ?? label)?.trim(),
                                        };
                                      }),
                                  })
                                }
                                placeholder={"هر گزینه در یک خط: عنوان|value"}
                              />
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className={`${button} border`}
                          onClick={() => addField(si)}>
                          <Plus className="ml-2 inline" size={16} />
                          افزودن فیلد
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`${button} border`}
                    onClick={addSection}>
                    <Plus className="ml-2 inline" size={16} />
                    افزودن بخش
                  </button>
                </div>
              }
              <div className="mt-5 flex gap-2">
                <button
                  onClick={saveForm}
                  className={`${button} bg-indigo-600 text-white`}>
                  ذخیره
                </button>
                <button
                  onClick={() => setShowFormEditor(false)}
                  className={`${button} border`}>
                  انصراف
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            {forms.map((f) => (
              <article
                key={f.id}
                className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{f.name}</h3>
                    <p className="text-sm text-gray-500">
                      {typeLabels[f.type]} · {f.versions.length} نسخه
                    </p>
                  </div>
                  <button
                    onClick={() => openNewVersion(f)}
                    className={`${button} border text-sm`}>
                    <Plus className="ml-1 inline" size={15} />
                    نسخه جدید
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {f.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <span>
                        نسخه {v.version}{" "}
                        {v.isPublished && (
                          <span className="mr-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                            منتشرشده
                          </span>
                        )}
                      </span>
                      {!v.isPublished && (
                        <button
                          onClick={() => publish(v.id)}
                          className="text-sm font-medium text-indigo-600">
                          <CheckCircle2 className="ml-1 inline" size={16} />
                          انتشار
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {tab === "jobs" && (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="h-fit rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold">
              {editingJobId ? "ویرایش موقعیت شغلی" : "ساخت موقعیت شغلی"}
            </h2>
            <div className="space-y-3">
              <label>
                عنوان
                <input
                  className={input}
                  value={job.title}
                  onChange={(e) =>
                    setJob({
                      ...job,
                      title: e.target.value,
                      slug: editingJobId ? job.slug : slugify(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                نامک URL
                <input
                  dir="ltr"
                  className={input}
                  value={job.slug}
                  onChange={(e) =>
                    setJob({ ...job, slug: slugify(e.target.value) })
                  }
                />
              </label>
              <label>
                توضیحات
                <textarea
                  className={input}
                  rows={3}
                  value={job.description}
                  onChange={(e) =>
                    setJob({ ...job, description: e.target.value })
                  }
                />
              </label>
              <label>
                دپارتمان
                <select
                  className={input}
                  value={job.departmentId}
                  onChange={(e) =>
                    setJob({ ...job, departmentId: e.target.value })
                  }>
                  <option value="">بدون دپارتمان</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                فرم پیش از مصاحبه
                <select
                  className={input}
                  value={job.preInterviewFormId}
                  onChange={(e) =>
                    setJob({ ...job, preInterviewFormId: e.target.value })
                  }>
                  <option value="">انتخاب کنید</option>
                  {byType("PRE_INTERVIEW")
                    .filter(published)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                فرم مصاحبه اولیه
                <select
                  className={input}
                  value={job.initialInterviewFormId}
                  onChange={(e) =>
                    setJob({ ...job, initialInterviewFormId: e.target.value })
                  }>
                  <option value="">انتخاب نشده</option>
                  {byType("INITIAL_INTERVIEW")
                    .filter(published)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                فرم مصاحبه فنی
                <select
                  className={input}
                  value={job.technicalInterviewFormId}
                  onChange={(e) =>
                    setJob({ ...job, technicalInterviewFormId: e.target.value })
                  }>
                  <option value="">انتخاب نشده</option>
                  {byType("TECHNICAL_INTERVIEW")
                    .filter(published)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                نقش بررسی‌کننده اولیه
                <select
                  className={input}
                  value={job.initialReviewerRoleId}
                  onChange={(e) =>
                    setJob({ ...job, initialReviewerRoleId: e.target.value })
                  }>
                  <option value="">انتخاب نشده</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={saveJob}
                  className={`${button} bg-indigo-600 text-white`}>
                  {editingJobId ? "ذخیره تغییرات" : "ساخت موقعیت"}
                </button>
                {editingJobId && (
                  <button onClick={resetJob} className={`${button} border`}>
                    انصراف
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {jobs.map((j) => (
              <article
                key={j.id}
                className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{j.title}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${j.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {j.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                    <p dir="ltr" className="text-sm text-gray-500">
                      /careers/{j.slug}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {j.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      فرم اولیه: {j.preInterviewForm?.name}{" "}
                      {j.department?.name && `· دپارتمان: ${j.department.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      target="_blank"
                      href={`/careers/${j.slug}`}
                      className={`${button} border text-sm`}>
                      مشاهده عمومی
                    </Link>
                    <button
                      onClick={() => editJob(j)}
                      className={`${button} border text-sm`}>
                      ویرایش
                    </button>
                    <button
                      onClick={() => toggleJob(j)}
                      className={`${button} ${j.isActive ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"} text-sm`}>
                      {j.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
