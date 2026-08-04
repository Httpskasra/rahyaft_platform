import { apiClient } from './client';
import type { SharedFormAnswers, SharedFormSchema } from '@/components/forms/schema';

const PUBLIC = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1') + '/public/recruitment';

export type RecruitmentFormType = 'PRE_INTERVIEW' | 'INITIAL_INTERVIEW' | 'TECHNICAL_INTERVIEW' | 'SUPERADMIN_REVIEW' | 'PROFILE_COMPLETION';
export interface RecruitmentFormVersion { id:string; version:number; schema:SharedFormSchema; isPublished:boolean; publishedAt?:string|null; createdAt:string; }
export interface RecruitmentFormTemplate { id:string; name:string; description?:string|null; type:RecruitmentFormType; isActive:boolean; versions:RecruitmentFormVersion[]; }
export interface RecruitmentJob { id:string; title:string; slug:string; description?:string|null; departmentId?:string|null; isActive:boolean; preInterviewFormId:string; initialInterviewFormId?:string|null; technicalInterviewFormId?:string|null; initialReviewerRoleId?:string|null; department?:{id:string;name:string}|null; preInterviewForm?:RecruitmentFormTemplate; initialInterviewForm?:RecruitmentFormTemplate|null; technicalInterviewForm?:RecruitmentFormTemplate|null; }

export const recruitmentApi = {
  publicJobs: () => fetch(`${PUBLIC}/jobs`).then(r => r.json()),
  publicJob: (slug:string) => fetch(`${PUBLIC}/jobs/${slug}`).then(r => { if(!r.ok) throw new Error('موقعیت یافت نشد'); return r.json(); }),
  apply: (slug:string,payload:{fullName:string;phoneNumber:string;email?:string;nationalCode?:string;formVersionId:string;answers:SharedFormAnswers}) => fetch(`${PUBLIC}/jobs/${slug}/applications`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message??'خطا در ثبت');return d}),
  applications: () => apiClient.get('/recruitment/applications').then(r=>r.data),
  application: (id:string) => apiClient.get(`/recruitment/applications/${id}`).then(r=>r.data),
  action: (id:string,action:string,data:unknown={}) => apiClient.post(`/recruitment/applications/${id}/${action}`,data).then(r=>r.data),
  adminForms: ():Promise<RecruitmentFormTemplate[]> => apiClient.get('/recruitment/admin/forms').then(r=>r.data),
  createForm: (payload:{name:string;description?:string;type:RecruitmentFormType;schema:SharedFormSchema}) => apiClient.post('/recruitment/admin/forms',payload).then(r=>r.data),
  createFormVersion: (templateId:string,schema:SharedFormSchema) => apiClient.post(`/recruitment/admin/forms/${templateId}/versions`,{schema}).then(r=>r.data),
  publishFormVersion: (versionId:string) => apiClient.post(`/recruitment/admin/forms/versions/${versionId}/publish`).then(r=>r.data),
  adminJobs: ():Promise<RecruitmentJob[]> => apiClient.get('/recruitment/admin/jobs').then(r=>r.data),
  createJob: (payload:Partial<RecruitmentJob>) => apiClient.post('/recruitment/admin/jobs',payload).then(r=>r.data),
  updateJob: (id:string,payload:Partial<RecruitmentJob>) => apiClient.patch(`/recruitment/admin/jobs/${id}`,payload).then(r=>r.data),
};
