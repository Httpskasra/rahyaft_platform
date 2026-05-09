import { apiClient } from "./client";

export interface ApprovalStep {
  stepOrder: number;
  roleId: string;
}

export interface ApprovalPolicy {
  id: string;
  formId: string;
  steps: (ApprovalStep & { role: { id: string; name: string } })[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  id: string;
  stepId: string;
  stepOrder?: number;
  approverId: string;
  approver: { id: string; name: string; phoneNumber: string };
  action: "APPROVED" | "REJECTED";
  comments: string | null;
  createdAt: string;
}

export interface ApprovalInstanceStatus {
  submissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentStepOrder: number | null;
  totalSteps: number;
  isCompleted: boolean;
  actions: (ApprovalAction & { step: { stepOrder: number; role: { name: string } } })[];
}

export const approvalsApi = {
  getPolicy: (formId: string) =>
    apiClient.get<ApprovalPolicy | null>(`/approvals/forms/${formId}/policy`),

  upsertPolicy: (formId: string, steps: ApprovalStep[]) =>
    apiClient.put<ApprovalPolicy>(`/approvals/forms/${formId}/policy`, { steps }),

  deletePolicy: (formId: string) =>
    apiClient.delete(`/approvals/forms/${formId}/policy`),

  getSubmissionStatus: (submissionId: string) =>
    apiClient.get<ApprovalInstanceStatus>(`/approvals/submissions/${submissionId}/status`),

  approveStep: (submissionId: string, stepOrder: number, action: "APPROVED" | "REJECTED", comments?: string) =>
    apiClient.post(`/approvals/submissions/${submissionId}/approve`, { stepOrder, action, comments }),
};