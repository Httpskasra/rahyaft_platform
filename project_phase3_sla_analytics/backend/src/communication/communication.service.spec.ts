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
  const service = new CommunicationService(prisma, {} as any);

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

describe('CommunicationService Phase 3 entity integration', () => {
  const baseUser: AuthenticatedUser = {
    ...user,
    roles: [{
      id: 'role-1',
      name: 'member',
      permissions: [
        { action: 'read', resource: 'repairs', scope: ScopeType.ORG_WIDE, relationType: null, constraints: {} },
        { action: 'read', resource: 'forms', scope: ScopeType.ORG_WIDE, relationType: null, constraints: {} },
      ],
    }],
  };

  it('prevents linking a protected module when read permission is missing', async () => {
    const { ThreadEntityType } = await import('../generated/prisma/enums');
    const service = new CommunicationService({} as any, {} as any);
    expect(() => (service as any).assertEntityModuleAccess(ThreadEntityType.REPAIR, user)).toThrow();
  });

  it('allows linking a protected module when read permission exists', async () => {
    const { ThreadEntityType } = await import('../generated/prisma/enums');
    const service = new CommunicationService({} as any, {} as any);
    expect(() => (service as any).assertEntityModuleAccess(ThreadEntityType.REPAIR, baseUser)).not.toThrow();
  });

  it('resolves a customer to a stable link snapshot', async () => {
    const { ThreadEntityType } = await import('../generated/prisma/enums');
    const db = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'customer-1',
          organizationName: 'بیمارستان تست',
          firstName: null,
          lastName: null,
          mobile: '09120000000',
          city: 'تهران',
        }),
      },
    };
    const service = new CommunicationService({} as any, {} as any);
    await expect((service as any).searchEntityById(ThreadEntityType.CUSTOMER, 'customer-1', db)).resolves.toMatchObject({
      label: 'بیمارستان تست',
      subtitle: '09120000000',
    });
  });
});

it('auto-links a repair to its parent customer context', async () => {
  const { ThreadEntityType } = await import('../generated/prisma/enums');
  const db = {
    repairCase: {
      findUnique: jest.fn()
        .mockResolvedValueOnce({
          caseNumber: 'R-100',
          deviceTitle: 'Ventilator',
          serialNumber: 'SN-1',
          status: 'REGISTERED',
        })
        .mockResolvedValueOnce({ customerId: 'customer-1' }),
    },
    customer: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'customer-1',
        organizationName: 'بیمارستان والد',
        firstName: null,
        lastName: null,
        mobile: '09120000000',
        city: 'تهران',
      }),
    },
  };
  const service = new CommunicationService({} as any, {} as any);
  const links = await (service as any).resolveEntityContext(ThreadEntityType.REPAIR, 'repair-1', db);
  expect(links.map((link: any) => link.entityType)).toEqual([
    ThreadEntityType.REPAIR,
    ThreadEntityType.CUSTOMER,
  ]);
  expect(links[1]).toMatchObject({
    entityId: 'customer-1',
    label: 'بیمارستان والد',
  });
});
