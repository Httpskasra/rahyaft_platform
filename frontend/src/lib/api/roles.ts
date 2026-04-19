import { apiClient } from "./client";

export const rolesApi = {
  findAll: () => apiClient.get("/roles"),

  create: (body: { name: string }) =>
    apiClient.post("/roles", body),

  remove: (roleId: string) =>
    apiClient.delete(`/roles/${roleId}`),

  rename: (roleId: string, body: { name: string }) =>
    apiClient.patch(`/roles/${roleId}`, body),

  addPermission: (
    roleId: string,
    body: {
      action: string;
      resource: string;
      scope: string;
      relationType?: string;
      constraints?: object;
    }
  ) => apiClient.post(`/roles/${roleId}/permissions`, body),

  assignToUser: (body: { userId: string; roleId: string }) =>
    apiClient.post("/roles/assign", body),

  removeFromUser: (body: { userId: string; roleId: string }) =>
    apiClient.delete("/roles/assign", { data: body }),
};