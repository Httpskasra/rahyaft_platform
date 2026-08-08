/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import {
  recruitmentApi,
  type RecruitmentFormTemplate,
  type RecruitmentFormType,
  type RecruitmentJob,
} from "@/lib/api/recruitment";
import { departmentsApi } from "@/lib/api/departments";
import { rolesApi } from "@/lib/api/roles";
import type { SharedFormField, SharedFormSchema } from "@/components/forms/schema";
import { emptySchema } from "./constants";

export function useRecruitmentSettings() {
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

  return {
    tab, setTab, forms, jobs, departments, roles, loading, message, error,
    showFormEditor, setShowFormEditor, editingTemplate, formMeta, setFormMeta,
    schema, setSchema, preview, setPreview, job, setJob, editingJobId,
    published, byType, slugify, openNewForm, openNewVersion, addSection,
    updateSection, removeSection, addField, updateField, removeField, saveForm,
    publish, resetJob, editJob, saveJob, toggleJob,
  };

}

export type RecruitmentSettingsModel = ReturnType<typeof useRecruitmentSettings>;
