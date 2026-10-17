export const PERMISSION_CATALOG = {
  users: ['read', 'create', 'update', 'delete'],
  roles: ['read', 'create', 'update', 'delete', 'assign'],
  departments: ['read', 'create', 'update', 'delete'],
  'user-info': ['read', 'create', 'update', 'delete'],
  attendance: ['read', 'create'],
  customers: ['read', 'create', 'update', 'delete', 'manage-contacts', 'manage-opportunities', 'log-activity', 'analyze'],
  repairs: ['read', 'create', 'update', 'assign'],
  communication: ['read', 'create', 'update'],
  forms: ['read', 'create', 'update', 'delete'],
  'form-submissions': ['read', 'create'],
  approvals: ['approve'],
  'production-flows': ['read', 'create', 'update', 'delete'],
  'production-runs': ['read', 'create', 'update', 'execute', 'supervise', 'approve', 'qc'],
  'recruitment-applications': ['read', 'review-initial', 'conduct-initial-interview', 'assign-technical-interviewer', 'final-approve'],
  'recruitment-interviews': ['conduct-technical-interview'],
  'recruitment-settings': ['manage'],
} as const;

export type PermissionResource = keyof typeof PERMISSION_CATALOG;
export type PermissionAction<R extends PermissionResource = PermissionResource> = (typeof PERMISSION_CATALOG)[R][number];

export const ALL_PERMISSIONS = Object.entries(PERMISSION_CATALOG).flatMap(([resource, actions]) =>
  actions.map((action) => ({ action, resource })),
);

export function isKnownPermission(action: string, resource: string): boolean {
  const actions = PERMISSION_CATALOG[resource as PermissionResource] as readonly string[] | undefined;
  return !!actions?.includes(action);
}
