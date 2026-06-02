import { Module } from '@nestjs/common';
import { BaleService } from './bale.service';
import { BaleWebhookController } from './bale.webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BaleWebhookController],
  providers: [BaleService],
  exports: [BaleService],
})
export class BaleModule {}