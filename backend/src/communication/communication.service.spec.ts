import { ScopeType } from '../generated/prisma/enums';
import type { AuthenticatedUser, PermissionEntry } from '../common/interfaces/auth.interface';
import { CommunicationService } from './communication.service';

const user: AuthenticatedUser = {
  id: 'user-1',
  phoneNumber: '09000000000',
  name: 'Test User',
  departmentId: 'dept-1',
  managerId: null,
  roles: [],
};

const permission = (scope: ScopeType): PermissionEntry => ({
  action: 'read',
  resource: 'communication',
  scope,
  relationType: null,
  constraints: {},
});

describe('CommunicationService Phase 1.5 scope hardening', () => {
  const prisma = {
    department: { findMany: jest.fn() },
    departmentRelation: { findMany: jest.fn() },
  } as any;
  const service = new CommunicationService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('allows ORG_WIDE to query all threads', async () => {
    await expect((service as any).buildThreadScopeWhere(user, permission(ScopeType.ORG_WIDE))).resolves.toEqual({});
  });

  it('keeps SELF limited to active membership', async () => {
    await expect((service as any).buildThreadScopeWhere(user, permission(ScopeType.SELF))).resolves.toEqual({
      participants: { some: { userId: user.id, leftAt: null } },
    });
  });

  it('covers the same department while preserving explicit membership', async () => {
    const where = await (service as any).buildThreadScopeWhere(user, permission(ScopeType.DEPARTMENT));
    expect(where.OR).toContainEqual({ participants: { some: { userId: user.id, leftAt: null } } });
    expect(where.OR).toContainEqual({ departmentId: user.departmentId });
  });

  it('resolves child departments for DEPARTMENT_SUBTREE', async () => {
    prisma.department.findMany
      .mockResolvedValueOnce([{ id: 'dept-child' }])
      .mockResolvedValueOnce([]);
    const where = await (service as any).buildThreadScopeWhere(user, permission(ScopeType.DEPARTMENT_SUBTREE));
    expect(where.OR).toContainEqual({ departmentId: { in: ['dept-1', 'dept-child'] } });
  });
});
