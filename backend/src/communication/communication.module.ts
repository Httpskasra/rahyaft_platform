import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommunicationController } from './communication.controller';
import { CommunicationRealtimeService } from './communication.realtime.service';
import { CommunicationService } from './communication.service';
import { CommunicationWebSocketServer } from './communication.websocket';
@Module({
  imports: [JwtModule.register({})],
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationRealtimeService, CommunicationWebSocketServer],
  exports: [CommunicationService, CommunicationWebSocketServer],
})
export class CommunicationModule {}
