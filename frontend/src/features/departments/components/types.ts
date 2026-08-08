import type { DepartmentRelationType } from "@/lib/api/departments";

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
