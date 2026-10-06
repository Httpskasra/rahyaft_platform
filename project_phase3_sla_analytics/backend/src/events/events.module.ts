import { Global, Module } from '@nestjs/common';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { EventsService } from './events.service';

@Global()
@Module({
  imports: [RabbitMQModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}