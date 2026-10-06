import type { AuthenticatedUser, PermissionEntry } from '../common/interfaces/auth.interface';
import { ScopeType } from '../generated/prisma/enums';
const rank: Record<ScopeType, number> = {
  [ScopeType.SELF]: 1,
  [ScopeType.TEAM]: 2,
  [ScopeType.DEPARTMENT]: 3,
  [ScopeType.RELATED_DEPARTMENTS]: 4,
  [ScopeType.DEPARTMENT_SUBTREE]: 5,
  [ScopeType.ORG_WIDE]: 6,
};
export function resolveCommunicationPermission(user: AuthenticatedUser, action: string): PermissionEntry | null {
  const items = user.roles.flatMap((r) => r.permissions).filter((p) => p.action === action && p.resource === 'communication');
  return items.length ? [...items].sort((a, b) => rank[b.scope] - rank[a.scope])[0] : null;
}
