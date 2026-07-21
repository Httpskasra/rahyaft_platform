import { DepartmentRelationType } from '../../generated/prisma/enums';

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
  type: 'MANAGES';
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
