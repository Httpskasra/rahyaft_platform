import type { AiAnalyticsResult } from './analytics';
import { apiClient } from './client';

export interface ProductionUser { id: string; name: string; phoneNumber: string; departmentId: string }
export interface ProductionFormRef { id: string; name: string; customId?: string | null; description?: string | null; version?: number }
export interface ProductionChecklistTemplateItem { title: string; required?: boolean }
export interface ProductionChecklistItem { id: string; title: string; required: boolean; checked: boolean; checkedAt?: string | null; checkedById?: string | null }
export interface ProductionFlowStep {
  id?: string; stepOrder: number; name: string; description?: string | null; formId: string;
  assigneeUserId: string; supervisorUserId?: string | null; approverUserId?: string | null; estimatedMinutes?: number | null;
  checklistTemplate?: ProductionChecklistTemplateItem[] | null;
  form?: ProductionFormRef; assignee?: ProductionUser; supervisor?: ProductionUser | null; approver?: ProductionUser | null;
}
export interface ProductionFlow {
  id: string; name: string; code?: string | null; description?: string | null; isActive: boolean;
  requiresQc: boolean; qcAssigneeId?: string | null; qcAssignee?: ProductionUser | null;
  createdAt: string; updatedAt: string; steps: ProductionFlowStep[]; createdBy?: ProductionUser; _count?: { runs: number };
}
export type RunStatus = 'IN_PROGRESS'|'PAUSED'|'COMPLETED'|'CANCELLED';
export type RunStepStatus = 'LOCKED'|'READY'|'IN_PROGRESS'|'WAITING_SUPERVISOR'|'WAITING_APPROVAL'|'NEEDS_REVISION'|'COMPLETED'|'SKIPPED';
export type QcStatus = 'NOT_REQUIRED'|'PENDING'|'PASSED'|'FAILED';
export interface ProductionReview { id: string; type: 'SUPERVISOR'|'APPROVER'; action: 'APPROVED'|'REJECTED'; comment?: string; createdAt: string; reviewer: ProductionUser }
export interface ProductionRunStep {
  id: string; stepOrder: number; name: string; description?: string; formId: string; assigneeUserId: string;
  supervisorUserId?: string | null; approverUserId?: string | null; status: RunStepStatus; attempt: number;
  startedAt?: string | null; submittedAt?: string | null; completedAt?: string | null; checklist?: ProductionChecklistItem[] | null;
  assignee: ProductionUser; supervisor?: ProductionUser | null; approver?: ProductionUser | null;
  submission?: { id:string; data: Record<string, unknown>; createdAt:string } | null; reviews: ProductionReview[];
}
export interface ProductionRun {
  id: string; title: string; productName: string; productCode?: string | null; serialNumber?: string | null; batchNumber?: string | null;
  quantity: number; dueDate?: string | null; referenceNo: string; status: RunStatus; currentStepOrder?: number | null;
  qcStatus: QcStatus; qcAssigneeId?: string | null; qcAssignee?: ProductionUser | null; qcReviewer?: ProductionUser | null; qcNotes?: string | null; qcReviewedAt?: string | null;
  startedAt: string; completedAt?: string | null; flow: { id:string; name:string; code?:string|null; requiresQc?: boolean }; startedBy: ProductionUser; steps: ProductionRunStep[];
}
export interface FlowPayload {
  name:string; code?:string; description?:string; isActive?:boolean; requiresQc?:boolean; qcAssigneeId?:string;
  steps: Array<{ stepOrder:number; name:string; description?:string; formId:string; assigneeUserId:string; supervisorUserId?:string; approverUserId?:string; estimatedMinutes?:number; checklist?:ProductionChecklistTemplateItem[] }>;
}
export interface ProductionAnalytics {
  range: { from: string; to: string };
  kpis: { total:number; active:number; completed:number; cancelled:number; overdue:number; completionRate:number|null; avgCycleHours:number|null; qcPassRate:number|null; qcFailed:number; checklistCompletionRate:number|null };
  trend: { date:string; started:number; completed:number }[];
  statusDistribution: { status:RunStatus; count:number }[];
  qcDistribution: { status:QcStatus; count:number }[];
  flows: { id:string; name:string; total:number; completed:number; completionRate:number; qcFailed:number; avgCycleHours:number|null }[];
  assignees: { id:string; name:string; steps:number; completed:number; revisions:number }[];
  bottlenecks: { name:string; samples:number; avgHours:number }[];
  recent: { id:string; referenceNo:string; productName:string; serialNumber?:string|null; flow:string; status:RunStatus; qcStatus:QcStatus; startedAt:string; completedAt?:string|null }[];
}

export const productionApi = {
  catalog: () => apiClient.get<{forms: ProductionFormRef[]; users: ProductionUser[]}>('/production/catalog'),
  flows: () => apiClient.get<ProductionFlow[]>('/production/flows'),
  flow: (id:string) => apiClient.get<ProductionFlow>(`/production/flows/${id}`),
  createFlow: (data:FlowPayload) => apiClient.post<ProductionFlow>('/production/flows', data),
  updateFlow: (id:string, data:FlowPayload) => apiClient.patch<ProductionFlow>(`/production/flows/${id}`, data),
  deleteFlow: (id:string) => apiClient.delete(`/production/flows/${id}`),
  startRun: (flowId:string, data:{title:string; productName:string; productCode?:string; serialNumber?:string; batchNumber?:string; quantity?:number; dueDate?:string; metadata?:Record<string,unknown>}) => apiClient.post<ProductionRun>(`/production/flows/${flowId}/runs`, data),
  runs: (filters?:{q?:string;status?:string;flowId?:string;qcStatus?:string}) => {
    const p = new URLSearchParams();
    if (filters?.q) p.set('q', filters.q); if (filters?.status) p.set('status', filters.status); if (filters?.flowId) p.set('flowId', filters.flowId); if (filters?.qcStatus) p.set('qcStatus', filters.qcStatus);
    return apiClient.get<ProductionRun[]>(`/production/runs${p.size ? `?${p.toString()}` : ''}`);
  },
  run: (id:string) => apiClient.get<ProductionRun>(`/production/runs/${id}`),
  myTasks: () => apiClient.get<ProductionRunStep[]>('/production/tasks/my'),
  begin: (runId:string, stepId:string) => apiClient.post(`/production/runs/${runId}/steps/${stepId}/begin`),
  updateChecklist: (runId:string, stepId:string, itemId:string, checked:boolean) => apiClient.patch<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/checklist`, {itemId, checked}),
  submit: (runId:string, stepId:string, data:Record<string,unknown>) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/submit`, {data}),
  reviewSupervisor: (runId:string, stepId:string, action:'APPROVED'|'REJECTED', comment?:string) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/supervisor-review`, {action, comment}),
  reviewApproval: (runId:string, stepId:string, action:'APPROVED'|'REJECTED', comment?:string) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/approval`, {action, comment}),
  reviewQc: (runId:string, status:'PASSED'|'FAILED', notes?:string) => apiClient.post<ProductionRun>(`/production/runs/${runId}/qc`, {status, notes}),
  status: (runId:string, action:'pause'|'resume'|'cancel') => apiClient.post(`/production/runs/${runId}/${action}`),
  analytics: (range='30d', q='') => apiClient.get<ProductionAnalytics>(`/production/analytics/overview?range=${range}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  aiSummary: (range='30d', q='') => apiClient.post<AiAnalyticsResult>(`/production/analytics/ai-summary?range=${range}${q ? `&q=${encodeURIComponent(q)}` : ''}`, {}),
  askAnalytics: (question:string, range='30d', q='') => apiClient.post<AiAnalyticsResult>(`/production/analytics/ask?range=${range}${q ? `&q=${encodeURIComponent(q)}` : ''}`, {question}),
};
