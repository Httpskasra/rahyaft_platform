import { apiClient } from "./client";

export const rolesApi = {
  suggest: (body: {description: string}) => apiClient.post("/roles/advisor/suggest", body),
  findAll: () => apiClient.get("/roles"),

  create: (body: { name: string }) =>
    apiClient.post("/roles", body),

  remove: (roleId: string) =>
    apiClient.delete(`/roles/${roleId}`),

  rename: (roleId: string, body: { name: string }) =>
    apiClient.patch(`/roles/${roleId}`, body),

  syncPermissions: (
    roleId: string,
    body: { permissions: Array<{ action: string; resource: string; scope: string; relationType?: string; constraints?: object }> }
  ) => apiClient.put(`/roles/${roleId}/permissions`, body),

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
    apiClient.delete(`/roles/assign/${body.userId}/${body.roleId}`),
};