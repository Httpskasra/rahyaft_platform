import { Global, Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { SequenceService } from './sequence.service';

@Global()
@Module({
  providers: [SequenceService, AccessService],
  exports: [SequenceService, AccessService],
})
export class SharedModule {}
