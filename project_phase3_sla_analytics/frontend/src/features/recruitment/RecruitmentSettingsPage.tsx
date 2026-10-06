/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import {
  Plus,
  Eye,
  CheckCircle2,
  BriefcaseBusiness,
  FileText,
  Trash2,
} from "lucide-react";
import type { RecruitmentFormType } from "@/lib/api/recruitment";
import { SharedFormRenderer } from "@/components/forms/SharedFormRenderer";
import type { SharedFormSchema } from "@/components/forms/schema";
import { useRecruitmentSettings } from "./useRecruitmentSettings";

import { button, input, typeLabels } from "./constants";

export default function RecruitmentSettingsPage() {
  const settings = useRecruitmentSettings();
  const {
    tab, setTab, forms, jobs, departments, roles, loading, message, error,
    showFormEditor, setShowFormEditor, editingTemplate, formMeta, setFormMeta,
    schema, setSchema, preview, setPreview, job, setJob, editingJobId,
    published, byType, slugify, openNewForm, openNewVersion, addSection,
    updateSection, removeSection, addField, updateField, removeField, saveForm,
    publish, resetJob, editJob, saveJob, toggleJob,
  } = settings;
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
                            {/* <input
                              className={input}
                              value={field.key}
                              onChange={(e) =>
                                updateField(si, fi, {
                                  key: e.target.value.replace(/\s+/g, "_"),
                                })
                              }
                              placeholder="کلید"
                            /> */}
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
