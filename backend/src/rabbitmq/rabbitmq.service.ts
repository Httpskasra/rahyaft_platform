import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';

export interface SubmissionEvent {
  id: string;
  formId: string;
  formVersion: number;
  userId?: string;
  data: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: amqplib.Connection;
  private channel!: amqplib.ConfirmChannel;
  private readonly exchange = 'form_submissions';
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
      this.connection = await amqplib.connect(url);
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

      await this.channel.assertExchange(this.exchange, 'fanout', {
        durable: true,
        autoDelete: false,
      });

      this.isReady = true;
      this.logger.log(`Exchange '${this.exchange}' ready`);
    } catch (err) {
      this.logger.error(`Failed to connect to RabbitMQ: ${(err as Error).message}`);
      // Don't crash the app — forms still save to DB even without analytics
    }
  }

  async publish(event: SubmissionEvent): Promise<void> {
    if (!this.isReady || !this.channel) {
      this.logger.warn('RabbitMQ not ready — skipping publish');
      return;
    }

    const msg = Buffer.from(JSON.stringify(event));
    return new Promise<void>((resolve, reject) => {
      this.channel.publish(
        this.exchange,
        '',
        msg,
        { persistent: true, contentType: 'application/json' },
        (err) => {
          if (err) {
            this.logger.error(`Publish failed: ${err.message}`);
            return reject(err);
          }
          this.logger.log(`Published submission event (${event.id})`);
          resolve();
        },
      );
    });
  }
}
