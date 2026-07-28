/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelModel, ConfirmChannel } from 'amqplib';

export interface SubmissionEvent {
  id: string;
  formId: string;
  formVersion: number;
  userId?: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  type: string;
  source: string;
  occurredAt: string;
  payload: TPayload;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: ChannelModel;
  private channel!: ConfirmChannel;

  private readonly formExchange = 'form_submissions';
  private readonly domainExchange = 'domain_events';

  private readonly logger = new Logger(RabbitMQService.name);
  private isReady = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.init();
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (err) {
      this.logger.warn(`Error closing RabbitMQ: ${(err as Error).message}`);
    }
  }

  private async init() {
    const url = this.config.get<string>(
      'RABBITMQ_URL',
      'amqp://user:pass@rabbitmq:5672',
    );

    try {
      this.connection = await amqp.connect(url);
      this.logger.log(`Connected to RabbitMQ (${url})`);

      this.connection.on('error', (err) => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`);
        this.isReady = false;
      });

      this.channel = await this.connection.createConfirmChannel();

      this.channel.on('error', (err) => {
        this.logger.error(`Channel error: ${err.message}`);
        this.isReady = false;
      });

      await this.channel.assertExchange(this.formExchange, 'fanout', {
        durable: true,
        autoDelete: false,
      });

      await this.channel.assertExchange(this.domainExchange, 'topic', {
        durable: true,
        autoDelete: false,
      });

      this.isReady = true;

      this.logger.log(`Exchange '${this.formExchange}' ready`);
      this.logger.log(`Exchange '${this.domainExchange}' ready`);
    } catch (err) {
      this.logger.error(
        `Failed to connect to RabbitMQ: ${(err as Error).message}`,
      );
    }
  }

  async publish(event: SubmissionEvent): Promise<void> {
    return this.publishToExchange(this.formExchange, '', event);
  }

  async publishDomainEvent<TPayload = Record<string, unknown>>(
    routingKey: string,
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    return this.publishToExchange(this.domainExchange, routingKey, event);
  }

  private async publishToExchange(
    exchange: string,
    routingKey: string,
    event: unknown,
  ): Promise<void> {
    if (!this.isReady || !this.channel) {
      this.logger.warn(`RabbitMQ not ready — skipping publish to ${exchange}`);
      return;
    }

    const msg = Buffer.from(JSON.stringify(event));

    return new Promise<void>((resolve, reject) => {
      this.channel.publish(
        exchange,
        routingKey,
        msg,
        {
          persistent: true,
          contentType: 'application/json',
        },
        (err) => {
          if (err) {
            this.logger.error(`Publish failed: ${err.message}`);
            return reject(err);
          }

          this.logger.log(
            `Published event to ${exchange} with routingKey='${routingKey}'`,
          );
          resolve();
        },
      );
    });
  }
}