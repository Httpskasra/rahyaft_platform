export type ScopeType =
  | "SELF"
  | "TEAM"
  | "DEPARTMENT"
  | "DEPARTMENT_SUBTREE"
  | "RELATED_DEPARTMENTS"
  | "ORG_WIDE";

export type DepartmentRelationType =
  | "SUPPORTS"
  | "COLLABORATES"
  | "AUDITS"
  | "SERVES";

export interface Permission {
  id: string;
  action: string;
  resource: string;
}

export interface RolePermission {
  id: string;
  permissionId: string;
  scope: ScopeType;
  relationType: DepartmentRelationType | null;
  constraints: unknown;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  permissions: RolePermission[];
}

export interface PermRowState {
  enabled: boolean;
  scope: ScopeType;
}

export type PermMatrix = Record<string, PermRowState>;
export type Resource = string;
