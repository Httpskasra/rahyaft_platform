// lib/api/users.ts
import { apiClient } from "./client";

// تایپ منطبق بر خروجی NestJS (مطابق USER_SELECT در users.service.ts)
export interface UserData {
  id: string;
  phoneNumber: string;
  name: string;
  departmentId: string;
  managerId: string | null;
  employeeCode: string | null;
  createdAt: string;
  roles: {
    role: {
      id: string;
      name: string;
    };
  }[];
}

export interface CreateUserDto {
  name: string;
  phoneNumber: string;
  departmentId: string;
  managerId?: string;
  employeeCode?: string;
}

export interface UpdateUserDto {
  name?: string;
  phoneNumber?: string;
  departmentId?: string;
  managerId?: string;
  employeeCode?: string;
}

export const usersApi = {
  findAll: () =>
    apiClient.get<UserData[]>("/users"),

  findOne: (id: string) =>
    apiClient.get<UserData>(`/users/${id}`),

  create: (body: CreateUserDto) =>
    apiClient.post<UserData>("/users", body),

  getMySignature: () =>
    apiClient.get<{ hasSignature: boolean; signatureDataUrl: string | null }>("/users/me/signature"),

  saveMySignature: (signatureDataUrl: string) => apiClient.post<{
      status: "ACTIVE" | "PENDING";
      requiresApproval: boolean;
      hasSignature?: boolean;
      signatureDataUrl?: string;
      requestId?: string;
      createdAt?: string;
      message?: string;
    }>("/users/me/signature", { signatureDataUrl }),

  getMySignatureChangeRequest: () =>
    apiClient.get<null | {
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      reviewComment: string | null;
      reviewedAt: string | null;
      createdAt: string;
      reviewer: { id: string; name: string };
    }>("/users/me/signature-change-request"),

  getPendingSignatureChangeRequests: () =>
    apiClient.get<Array<{
      id: string;
      createdAt: string;
      requester: { id: string; name: string; employeeCode: string | null; department: { id: string; name: string } };
      currentSignatureDataUrl: string | null;
      requestedSignatureDataUrl: string;
    }>>("/users/signature-change-requests/pending"),

  approveSignatureChange: (requestId: string, comment?: string) =>
    apiClient.post(`/users/signature-change-requests/${requestId}/approve`, { comment }),

  rejectSignatureChange: (requestId: string, comment?: string) =>
    apiClient.post(`/users/signature-change-requests/${requestId}/reject`, { comment }),

  update: (id: string, body: UpdateUserDto) =>
    apiClient.patch<UserData>(`/users/${id}`, body),

  remove: (id: string) =>
    apiClient.delete(`/users/${id}`),
  resetBaleChat: (userId: string) =>
    apiClient.delete(`/users/${userId}/bale-chat`),
};