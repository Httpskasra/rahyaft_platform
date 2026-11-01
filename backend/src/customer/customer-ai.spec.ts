jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('src/generated/prisma/client', () => ({
  CustomerActivityType: { SALES_OPPORTUNITY_CREATED: 'SALES_OPPORTUNITY_CREATED' },
  CustomerType: {},
  SalesOpportunityStatus: { LOST: 'LOST' },
}), { virtual: true });

import { CustomerService } from './customer.service';

describe('CRM AI events', () => {
  const customerId = 'customer-1';
  let committed: boolean;
  let prisma: any;
  let events: any;
  let service: CustomerService;

  beforeEach(() => {
    committed = false;
    prisma = {
      customer: { findUnique: jest.fn().mockResolvedValue({ id: customerId }) },
      customerActivity: { create: jest.fn().mockResolvedValue({ id: 'activity-1' }) },
      salesOpportunity: { create: jest.fn().mockResolvedValue({ id: 'opp-1', title: 'Sale' }) },
      $transaction: jest.fn(async (callback) => {
        const result = await callback(prisma);
        committed = true;
        return result;
      }),
    };
    events = { publishCustomerEvent: jest.fn().mockResolvedValue(undefined) };
    service = new CustomerService(prisma, events);
  });

  it('publishes a sales event only after the transaction commits', async () => {
    const observedCommits: boolean[] = [];
    events.publishCustomerEvent.mockImplementation(async () => {
      observedCommits.push(committed);
    });
    await service.createSalesOpportunity(customerId, { title: 'Sale' });
    expect(observedCommits).toEqual([true]);
    expect(events.publishCustomerEvent).toHaveBeenCalledWith(
      'customer.sales_opportunity.created',
      { customerId, metadata: { opportunityId: 'opp-1' } },
    );
  });

  it('does not publish when the transaction rolls back', async () => {
    prisma.$transaction.mockImplementation(async (callback) => {
      await callback(prisma);
      throw new Error('rollback');
    });
    await expect(service.createSalesOpportunity(customerId, { title: 'Sale' })).rejects.toThrow('rollback');
    expect(events.publishCustomerEvent).not.toHaveBeenCalled();
  });

  it('triggers analysis after saving a note', async () => {
    await service.createActivity(customerId, { type: 'NOTE', title: 'Follow up' });
    expect(events.publishCustomerEvent).toHaveBeenCalledWith(
      'customer.activity.created', { customerId, metadata: { activityId: 'activity-1' } },
    );
  });

  it('does not acknowledge a failed manual request as queued', async () => {
    events.publishCustomerEvent.mockRejectedValue(new Error('unavailable'));
    await expect(service.requestAiAnalysis(customerId)).rejects.toMatchObject({ status: 503 });
  });
});
