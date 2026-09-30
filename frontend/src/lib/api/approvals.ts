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
  stepId?: string;
  stepOrder?: number;
  approverId?: string;
  approver?: { id: string; name: string; phoneNumber: string };
  action: "APPROVED" | "REJECTED";
  comments: string | null;
  signatureDataUrl?: string | null;
  createdAt: string;
  step?: { stepOrder: number; role: { id?: string; name: string } };
}

export interface ApprovalInstanceStatus {
  submissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentStepOrder: number | null;
  totalSteps: number;
  isCompleted: boolean;
  actions: (ApprovalAction & { step: { stepOrder: number; role: { name: string } } })[];
}

export interface ApprovalInboxItem {
  id: string;
  submissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentStepOrder: number | null;
  totalSteps: number;
  updatedAt: string;
  createdAt: string;
  form: { id: string; name: string; customId?: string | null; description?: string | null };
  submitter?: { id: string; name: string; phoneNumber: string } | null;
  submissionCreatedAt: string;
  currentRole?: { id: string; name: string } | null;
  previousActions?: ApprovalAction[];
}

export interface ApprovalHistoryItem {
  id: string;
  submissionId: string;
  action: "APPROVED" | "REJECTED";
  comments?: string | null;
  createdAt: string;
  step: { stepOrder: number; role: { id: string; name: string } };
  workflowStatus: "PENDING" | "APPROVED" | "REJECTED";
  form: { id: string; name: string; customId?: string | null; description?: string | null };
  submitter?: { id: string; name: string; phoneNumber: string } | null;
  submissionCreatedAt: string;
}

export interface ApprovalInboxResponse {
  signatureConfigured: boolean;
  stats: { pending: number; approved: number; rejected: number; processed: number };
  pending: ApprovalInboxItem[];
  history: ApprovalHistoryItem[];
}

export interface ApprovalInboxDetail {
  submissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentStepOrder: number | null;
  totalSteps: number;
  canAct: boolean;
  currentRole?: { id: string; name: string } | null;
  form: {
    id: string;
    name: string;
    customId?: string | null;
    description?: string | null;
    schema: { fields?: Array<{ id: string; label: string; type: string }> };
  };
  submission: {
    id: string;
    formVersion: number;
    data: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; name: string; phoneNumber: string } | null;
  };
  steps: Array<{ id: string; stepOrder: number; role: { id: string; name: string } }>;
  actions: ApprovalAction[];
}

export const approvalsApi = {
  getPolicy: (formId: string) =>
    apiClient.get<ApprovalPolicy | null>(`/approvals/forms/${formId}/policy`),

  upsertPolicy: (formId: string, steps: ApprovalStep[]) =>
    apiClient.put<ApprovalPolicy>(`/approvals/forms/${formId}/policy`, { steps }),

  deletePolicy: (formId: string) =>
    apiClient.delete(`/approvals/forms/${formId}/policy`),

  getInbox: () => apiClient.get<ApprovalInboxResponse>("/approvals/inbox"),

  getInboxDetail: (submissionId: string) =>
    apiClient.get<ApprovalInboxDetail>(`/approvals/inbox/${submissionId}`),

  getSubmissionStatus: (submissionId: string) =>
    apiClient.get<ApprovalInstanceStatus>(`/approvals/submissions/${submissionId}/status`),

  approveStep: (
    submissionId: string,
    stepOrder: number,
    action: "APPROVED" | "REJECTED",
    comments?: string,
  ) =>
    apiClient.post(`/approvals/submissions/${submissionId}/approve`, {
      stepOrder,
      action,
      comments,
    }),
};
