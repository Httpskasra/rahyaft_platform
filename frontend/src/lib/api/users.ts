// lib/api/users.ts
import { apiClient } from "./client";

// تایپ منطبق بر خروجی NestJS (مطابق USER_SELECT در users.service.ts)
export interface UserData {
  id: string;
  phoneNumber: string;
  name: string;
  departmentId: string;
  managerId: string | null;
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
}

export interface UpdateUserDto {
  name?: string;
  phoneNumber?: string;           // <── اکنون پشتیبانی می‌شود
  departmentId?: string;
  managerId?: string;
}

export const usersApi = {
  findAll: () =>
    apiClient.get<UserData[]>("/users"),

  findOne: (id: string) =>
    apiClient.get<UserData>(`/users/${id}`),

  create: (body: CreateUserDto) =>
    apiClient.post<UserData>("/users", body),

  update: (id: string, body: UpdateUserDto) =>   // phoneNumber اضافه شد
    apiClient.patch<UserData>(`/users/${id}`, body),

  remove: (id: string) =>
    apiClient.delete(`/users/${id}`),
};