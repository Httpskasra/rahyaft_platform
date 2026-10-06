import { apiClient } from './client';

export interface ProductionUser { id: string; name: string; phoneNumber: string; departmentId: string }
export interface ProductionFormRef { id: string; name: string; customId?: string | null; description?: string | null; version?: number }
export interface ProductionFlowStep {
  id?: string; stepOrder: number; name: string; description?: string | null; formId: string;
  assigneeUserId: string; supervisorUserId?: string | null; approverUserId?: string | null; estimatedMinutes?: number | null;
  form?: ProductionFormRef; assignee?: ProductionUser; supervisor?: ProductionUser | null; approver?: ProductionUser | null;
}
export interface ProductionFlow {
  id: string; name: string; code?: string | null; description?: string | null; isActive: boolean;
  createdAt: string; updatedAt: string; steps: ProductionFlowStep[]; createdBy?: ProductionUser; _count?: { runs: number };
}
export type RunStatus = 'IN_PROGRESS'|'PAUSED'|'COMPLETED'|'CANCELLED';
export type RunStepStatus = 'LOCKED'|'READY'|'IN_PROGRESS'|'WAITING_SUPERVISOR'|'WAITING_APPROVAL'|'NEEDS_REVISION'|'COMPLETED'|'SKIPPED';
export interface ProductionReview { id: string; type: 'SUPERVISOR'|'APPROVER'; action: 'APPROVED'|'REJECTED'; comment?: string; createdAt: string; reviewer: ProductionUser }
export interface ProductionRunStep {
  id: string; stepOrder: number; name: string; description?: string; formId: string; assigneeUserId: string;
  supervisorUserId?: string | null; approverUserId?: string | null; status: RunStepStatus; attempt: number;
  startedAt?: string | null; submittedAt?: string | null; completedAt?: string | null;
  assignee: ProductionUser; supervisor?: ProductionUser | null; approver?: ProductionUser | null;
  submission?: { id:string; data: Record<string, unknown>; createdAt:string } | null; reviews: ProductionReview[];
}
export interface ProductionRun {
  id: string; title: string; referenceNo: string; status: RunStatus; currentStepOrder?: number | null;
  startedAt: string; completedAt?: string | null; flow: { id:string; name:string; code?:string|null }; startedBy: ProductionUser; steps: ProductionRunStep[];
}
export interface FlowPayload {
  name:string; code?:string; description?:string; isActive?:boolean;
  steps: Array<{ stepOrder:number; name:string; description?:string; formId:string; assigneeUserId:string; supervisorUserId?:string; approverUserId?:string; estimatedMinutes?:number }>;
}

export const productionApi = {
  catalog: () => apiClient.get<{forms: ProductionFormRef[]; users: ProductionUser[]}>('/production/catalog'),
  flows: () => apiClient.get<ProductionFlow[]>('/production/flows'),
  flow: (id:string) => apiClient.get<ProductionFlow>(`/production/flows/${id}`),
  createFlow: (data:FlowPayload) => apiClient.post<ProductionFlow>('/production/flows', data),
  updateFlow: (id:string, data:FlowPayload) => apiClient.patch<ProductionFlow>(`/production/flows/${id}`, data),
  deleteFlow: (id:string) => apiClient.delete(`/production/flows/${id}`),
  startRun: (flowId:string, data:{title:string; metadata?:Record<string,unknown>}) => apiClient.post<ProductionRun>(`/production/flows/${flowId}/runs`, data),
  runs: () => apiClient.get<ProductionRun[]>('/production/runs'),
  run: (id:string) => apiClient.get<ProductionRun>(`/production/runs/${id}`),
  myTasks: () => apiClient.get<ProductionRunStep[]>('/production/tasks/my'),
  begin: (runId:string, stepId:string) => apiClient.post(`/production/runs/${runId}/steps/${stepId}/begin`),
  submit: (runId:string, stepId:string, data:Record<string,unknown>) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/submit`, {data}),
  reviewSupervisor: (runId:string, stepId:string, action:'APPROVED'|'REJECTED', comment?:string) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/supervisor-review`, {action, comment}),
  reviewApproval: (runId:string, stepId:string, action:'APPROVED'|'REJECTED', comment?:string) => apiClient.post<ProductionRun>(`/production/runs/${runId}/steps/${stepId}/approval`, {action, comment}),
  status: (runId:string, action:'pause'|'resume'|'cancel') => apiClient.post(`/production/runs/${runId}/${action}`),
};
