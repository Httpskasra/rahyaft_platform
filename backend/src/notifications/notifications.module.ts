import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { BaleModule } from '../bale/bale.module';
import { BaleNotificationDeliveryService } from './bale-notification-delivery.service';

@Global()
@Module({ imports: [BaleModule], controllers: [NotificationsController], providers: [NotificationsService, BaleNotificationDeliveryService], exports: [NotificationsService] })
export class NotificationsModule {}
