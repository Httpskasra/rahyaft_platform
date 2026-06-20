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
  reason: string | null;
  createdAt: string;
}

export interface CreateRepairDto {
  customerId: string;
  deviceTitle: string;
  serialNumber?: string;
  problemDescription: string;
  type: RepairType;
}

export const repairsApi = {
  findAll: () => apiClient.get<RepairCase[]>("/repairs"),
  findOne: (id: string) => apiClient.get<RepairCaseDetail>(`/repairs/${id}`),
  create: (body: CreateRepairDto) => apiClient.post<RepairCase>("/repairs", body),
  assignTechnician: (id: string, technicianId: string) =>
    apiClient.patch(`/repairs/${id}/assign`, { technicianId }),
  changeStatus: (id: string, status: RepairStatus, reason?: string) =>
    apiClient.patch(`/repairs/${id}/status`, { status, reason }),
};