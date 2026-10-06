import { ScopeType } from '../../generated/prisma/enums';
import { PermissionGuard } from './permission.guard';

const permission = (scope: ScopeType) => ({
  action: 'read',
  resource: 'communication',
  scope,
  relationType: null,
  constraints: {},
});

describe('PermissionGuard strongest permission selection', () => {
  it('selects ORG_WIDE when the same permission exists with multiple scopes', () => {
    const guard = new PermissionGuard({} as any, {} as any);
    const user = {
      roles: [
        { id: 'r1', name: 'member', permissions: [permission(ScopeType.SELF)] },
        { id: 'r2', name: 'manager', permissions: [permission(ScopeType.ORG_WIDE)] },
      ],
    } as any;
    const selected = (guard as any).findMatchingPermission(user, {
      action: 'read',
      resource: 'communication',
    });
    expect(selected.scope).toBe(ScopeType.ORG_WIDE);
  });
});
