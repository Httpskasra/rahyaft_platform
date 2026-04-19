import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface PermissionEntry {
  action: string;
  resource: string;
  scope: string;
  relationType: string | null;
  constraints: Record<string, unknown>;
}

export interface RoleEntry {
  id: string;
  name: string;
  permissions: PermissionEntry[];
}

export interface MeResponse {
  id: string;
  phoneNumber: string;
  name: string;
  departmentId: string;
  managerId: string | null;
  roles: RoleEntry[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// Call NestJS directly — the Next.js API route proxies OTP for you
export const authApi = {
  sendOtp: (phoneNumber: string) =>
    apiClient.post("/auth/send-otp", { phoneNumber }),

  verifyOtp: (phoneNumber: string, otp: string): Promise<{ data: LoginResponse }> =>
    apiClient.post("/auth/verify-otp", { phoneNumber, otp }),

  refresh: (refreshToken: string) =>
    apiClient.post("/auth/refresh", { refreshToken }),

  logout: () => apiClient.post("/auth/logout"),

  me: (): Promise<{ data: MeResponse }> => apiClient.get("/auth/me"),
};