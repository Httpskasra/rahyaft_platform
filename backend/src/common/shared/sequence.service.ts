import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { persianYear } from './persian-date';

/**
 * Atomic, gap-tolerant document numbering: PREFIX-<jalali year>-<6 digit counter>
 * Pass a transaction client so the number is rolled back together with the document.
 */
@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(prefix: string, tx?: any): Promise<string> {
    const year = persianYear();
    const key = `${prefix}-${year}`;
    const client = tx ?? this.prisma;
    const row = await client.sequenceCounter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `${prefix}-${year}-${String(row.value).padStart(6, '0')}`;
  }
}
