export type CustomerDomainEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.contact.created'
  | 'customer.contact.updated'
  | 'customer.contact.deleted'
  | 'customer.sales_opportunity.created'
  | 'customer.sales_opportunity.updated'
  | 'customer.sales_opportunity.deleted'
  | 'customer.ai_analysis.requested';

export interface CustomerDomainEventPayload {
  customerId: string;
  actorUserId?: string;
  reason?: string;
  extraInstruction?: string;
  metadata?: Record<string, unknown>;
}