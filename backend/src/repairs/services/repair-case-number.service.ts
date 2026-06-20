/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RepairCaseNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const year = new Date().getFullYear();

    const count = await this.prisma.repairCase.count();

    return `RC-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
