import { apiClient } from "./client";

export type DepartmentRelationType =
  | "SUPPORTS"
  | "COLLABORATES"
  | "AUDITS"
  | "SERVES";

export const departmentsApi = {
  findAll: () => apiClient.get("/departments"),

  findOne: (id: string) => apiClient.get(`/departments/${id}`),

  create: (body: { name: string; parentId?: string }) =>
    apiClient.post("/departments", body),

  update: (id: string, body: { name?: string; parentId?: string }) =>
    apiClient.patch(`/departments/${id}`, body),

  remove: (id: string) => apiClient.delete(`/departments/${id}`),

  createRelation: (body: {
    fromDepartmentId: string;
    toDepartmentId: string;
    type: DepartmentRelationType;
  }) => apiClient.post("/departments/relations", body),

  removeRelation: (relationId: string) =>
    apiClient.delete(`/departments/relations/${relationId}`),
};
