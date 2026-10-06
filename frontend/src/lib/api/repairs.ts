import type { AiAnalyticsResult, AnalyticsAnomaly, AnalyticsInsight } from "./analytics";
import { apiClient } from "./client";

export type RepairStatus =
  | "REGISTERED"
  | "WAITING_REVIEW"
  | "WAITING_COST_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "IN_REPAIR"
  | "QC"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELED"
  | "NO_REPAIR_REQUIRED";

export type RepairType = "IN_HOUSE" | "ON_SITE";

export interface RepairCustomer {
  id: string;
  fullName: string;
  phoneNumber: string;
  companyName: string | null;
}

export interface RepairTechnician {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface RepairCase {
  id: string;
  caseNumber: string;
  customerId: string;
  type: RepairType;
  status: RepairStatus;
  technicianId: string | null;
  description: string | null;
  deviceTitle: string;
  serialNumber: string | null;
  problemDescription: string;
  estimatedCost: string | null;
  needCostApproval: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: RepairCustomer;
  technician: RepairTechnician | null;
}

export interface RepairCaseDetail extends RepairCase {
  visits: RepairVisit[];
  parts: RepairItem[];
  statusLogs: RepairStatusLog[];
}

export interface RepairVisit {
  id: string;
  repairCaseId: string;
  technicianId: string;
  scheduledAt: string;
  visitedAt: string | null;
  notes: string | null;
  result: "REPAIRED" | "NEED_SECOND_VISIT" | "NEED_PART" | "CUSTOMER_ABSENT" | "CANCELED";
  createdAt: string;
}

export interface RepairItem {
  id: string;
  repairCaseId: string;
  title: string;
  quantity: number;
  unitPrice: string;
  description: string | null;
  createdAt: string;
}

export interface RepairStatusLog {
  id: string;
  repairCaseId: string;
  oldStatus: RepairStatus | null;
  newStatus: RepairStatus;
  changedById: string;
  changedBy?: {
    id: string;
    name: string;
  };
  reason: string | null;
  createdAt: string;
}


export interface RepairAnalytics {
  range: { from: string; to: string };
  kpis: {
    total: number; totalChangePct: number | null; open: number; completed: number;
    canceledOrRejected: number; mttrDays: number | null; leadTimeDays: number | null;
    timeToStartHours: number | null;
  };
  trend: { date: string; created: number; completed: number }[];
  comparison: { previous: { total: number; mttrDays: number | null; leadTimeDays: number | null } };
  insights: AnalyticsInsight[];
  anomalies: AnalyticsAnomaly[];
  statusDistribution: { status: RepairStatus; count: number }[];
  typeDistribution: { type: RepairType; count: number }[];
  aging: { key: string; label: string; count: number }[];
  statusDuration: { status: RepairStatus; averageHours: number; samples: number }[];
  technicians: {
    id: string; name: string; assigned: number; open: number; completed: number;
    mttrDays: number | null; visits: number; firstVisitFixRate: number | null; secondVisitRate: number | null;
  }[];
  sla: {
    eligible: number; compliant: number; breached: number; atRisk: number; complianceRate: number | null; averageOverdueHours: number | null;
    trend: { date: string; compliant: number; breached: number }[];
    byType: { type: RepairType; targetHours: number | null; eligible: number; compliant: number; breached: number; complianceRate: number | null }[];
    breaches: { repairId: string; caseNumber: string; deviceTitle: string; type: RepairType; status: RepairStatus; technician: string | null; targetHours: number; dueAt: string; completedAt: string | null; breached: boolean; atRisk: boolean; elapsedHours: number; overdueHours: number }[];
  };
  visits: {
    total: number; casesWithVisits: number; firstVisitFixRate: number | null; secondVisitRate: number | null;
    resultDistribution: { result: RepairVisit["result"]; count: number }[];
  };
}

export interface RepairSlaPolicy { type: RepairType; targetHours: number | null; isActive: boolean; }

export interface CreateRepairDto {
  customerId: string;
  deviceTitle: string;
  serialNumber?: string;
  problemDescription: string;
  type: RepairType;
}

export const repairsApi = {
  findAll: () => apiClient.get<RepairCase[]>("/repairs"),
  getAnalytics: (range = "30d") => apiClient.get<RepairAnalytics>(`/repairs/analytics/overview?range=${range}`),
  getAiSummary: (range = "30d") => apiClient.post<AiAnalyticsResult>(`/repairs/analytics/ai-summary?range=${range}`, {}),
  askAnalytics: (question: string, range = "30d") => apiClient.post<AiAnalyticsResult>(`/repairs/analytics/ask?range=${range}`, { question }),
  getSlaPolicies: () => apiClient.get<RepairSlaPolicy[]>("/repairs/sla-policies"),
  updateSlaPolicies: (items: Array<{ type: RepairType; targetHours: number; isActive?: boolean }>) => apiClient.patch<RepairSlaPolicy[]>("/repairs/sla-policies", { items }),
  findOne: (id: string) => apiClient.get<RepairCaseDetail>(`/repairs/${id}`),
  create: (body: CreateRepairDto) => apiClient.post<RepairCase>("/repairs", body),
  assignTechnician: (id: string, technicianId: string) =>
    apiClient.patch(`/repairs/${id}/assign`, { technicianId }),
  changeStatus: (id: string, status: RepairStatus, reason?: string) =>
    apiClient.patch(`/repairs/${id}/status`, { status, reason }),
};