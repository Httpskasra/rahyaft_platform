import { Module } from '@nestjs/common';

import { RepairsController } from './repairs.controller';
import { RepairsService } from './repairs.service';

import { RepairCaseNumberService } from './services/repair-case-number.service';
import { RepairStatusService } from './services/repair-status.service';

@Module({
  controllers: [RepairsController],

  providers: [RepairsService, RepairCaseNumberService, RepairStatusService],

  exports: [RepairsService],
})
export class RepairsModule {}
