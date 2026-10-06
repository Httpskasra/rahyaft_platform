import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import {
  CustomerDomainEventPayload,
  CustomerDomainEventType,
} from './types/domain-event.types';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly rabbit: RabbitMQService) {}

  async publishCustomerEvent(
    type: CustomerDomainEventType,
    payload: CustomerDomainEventPayload,
  ) {
    const event = {
      eventId: randomUUID(),
      type,
      source: 'backend',
      occurredAt: new Date().toISOString(),
      payload,
    };

    try {
      await this.rabbit.publishDomainEvent(type, event);
    } catch (error) {
      this.logger.error(
        `Failed to publish customer event ${type}: ${(error as Error).message}`,
      );
    }
  }
}