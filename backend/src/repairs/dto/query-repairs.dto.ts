import { RepairStatus } from 'src/generated/prisma/enums';

export class QueryRepairsDto {
  page?: number;

  limit?: number;

  status?: RepairStatus;

  technicianId?: string;

  customerId?: string;

  search?: string;
}
