/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { RepairStatus } from 'src/generated/prisma/enums';

export const REPAIR_STATUS_FLOW = {
  [RepairStatus.REGISTERED]: [
    RepairStatus.WAITING_REVIEW,
    RepairStatus.CANCELED,
  ],

  [RepairStatus.WAITING_REVIEW]: [
    RepairStatus.WAITING_COST_APPROVAL,
    RepairStatus.IN_REPAIR,
    RepairStatus.NO_REPAIR_REQUIRED,
  ],

  [RepairStatus.WAITING_COST_APPROVAL]: [
    RepairStatus.APPROVED,
    RepairStatus.REJECTED,
  ],

  [RepairStatus.APPROVED]: [RepairStatus.IN_REPAIR],

  [RepairStatus.IN_REPAIR]: [RepairStatus.QC],

  [RepairStatus.QC]: [RepairStatus.READY_FOR_DELIVERY, RepairStatus.IN_REPAIR],

  [RepairStatus.READY_FOR_DELIVERY]: [RepairStatus.DELIVERED],

  [RepairStatus.DELIVERED]: [RepairStatus.CLOSED],
};
