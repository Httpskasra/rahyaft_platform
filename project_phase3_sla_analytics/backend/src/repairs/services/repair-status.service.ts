/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Injectable } from '@nestjs/common';
import { REPAIR_STATUS_FLOW } from '../constants/repair-status-flow';
import { RepairStatus } from 'src/generated/prisma/enums';

@Injectable()
export class RepairStatusService {
  validateTransition(current: RepairStatus, next: RepairStatus) {
    const allowed = REPAIR_STATUS_FLOW[current] || [];

    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot change status from ${current} to ${next}`,
      );
    }
  }
}
