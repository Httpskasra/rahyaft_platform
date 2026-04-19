import { apiClient } from "./client";

export const usersApi = {
  findAll: () => apiClient.get("/users"),
  findOne: (id: string) => apiClient.get(`/users/${id}`),
  create: (body: { name: string; phoneNumber: string; departmentId: string; managerId?: string }) =>
    apiClient.post("/users", body),
  update: (id: string, body: Partial<{ name: string; departmentId: string; managerId: string }>) =>
    apiClient.patch(`/users/${id}`, body),
  remove: (id: string) => apiClient.delete(`/users/${id}`),
};