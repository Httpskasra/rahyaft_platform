import { apiClient } from "./client";

export type DepartmentRelationType =
  | "SUPPORTS"
  | "COLLABORATES"
  | "AUDITS"
  | "SERVES";
export interface OrganizationChartRole {
  id: string;
  name: string;
}

export interface OrganizationChartEmployee {
  id: string;
  name: string;
  phoneNumber: string;
  employeeCode: string | null;
  departmentId: string;
  managerId: string | null;
  roles: OrganizationChartRole[];
  subordinateCount: number;
}

export interface OrganizationChartDepartment {
  id: string;
  name: string;
  parentId: string | null;
  employeeCount: number;
  directEmployeeCount: number;
  employees: OrganizationChartEmployee[];
}

export interface OrganizationChartDepartmentRelation {
  id: string;
  sourceDepartmentId: string;
  targetDepartmentId: string;
  type: DepartmentRelationType;
}

export interface OrganizationChartEmployeeRelation {
  sourceUserId: string;
  targetUserId: string;
  type: "MANAGES";
}

export interface OrganizationChartResponse {
  departments: OrganizationChartDepartment[];

  relations: {
    departments: OrganizationChartDepartmentRelation[];
    employees: OrganizationChartEmployeeRelation[];
  };

  statistics: {
    totalDepartments: number;
    totalEmployees: number;
    rootDepartments: number;
    employeesWithoutManager: number;
  };

  generatedAt: string;
}
export interface DepartmentChild {
  id: string;
  name: string;
}

export interface DepartmentRelation {
  id: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  type: DepartmentRelationType;
  toDepartment: { id: string; name: string };
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  children: DepartmentChild[];
  outgoingRelations: DepartmentRelation[];
}
export const departmentsApi = {
  findAll: () => apiClient.get<Department[]>("/departments"),

  findOne: (id: string) => apiClient.get<Department>(`/departments/${id}`),

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
  getOrganizationChart: (): Promise<{
    data: OrganizationChartResponse;
  }> => apiClient.get("/departments/organization-chart"),
};
