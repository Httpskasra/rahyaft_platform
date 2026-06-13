import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceImportResultDto } from './dto/attendance-import-result.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import {
  parseAttendanceWorkbook,
  ParsedAttendanceEntry,
} from './attendance-parser';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * پارس فایل اکسل تردد (در حافظه) و درج ترددها در دیتابیس.
   * فایل اکسل در هیچ مرحله ذخیره نمی‌شود.
   */
  async importFromExcel(buffer: Buffer): Promise<AttendanceImportResultDto> {
    const { entries } = parseAttendanceWorkbook(buffer);

    const employeeCodes = [...new Set(entries.map((e) => e.employeeCode))];

    const users = await this.prisma.user.findMany({
      where: { employeeCode: { in: employeeCodes } },
      select: { id: true, employeeCode: true },
    });

    const userIdByCode = new Map(
      users.map((u) => [u.employeeCode as string, u.id]),
    );

    const unmatchedEmployeeCodes = employeeCodes.filter(
      (code) => !userIdByCode.has(code),
    );

    const matchedEntries = entries.filter((e) =>
      userIdByCode.has(e.employeeCode),
    );

    const recordsCreated = await this.persistEntries(
      matchedEntries,
      userIdByCode,
    );

    return {
      totalRowsProcessed: entries.length,
      matchedUsers: userIdByCode.size,
      unmatchedEmployeeCodes,
      recordsCreated,
      recordsSkippedExisting: matchedEntries.length - recordsCreated,
      invalidTimeEntries: 0,
    };
  }

  /** درج دسته‌ای ترددها؛ رکوردهای تکراری (همان userId+checkTime) نادیده گرفته می‌شوند */
  private async persistEntries(
    entries: ParsedAttendanceEntry[],
    userIdByCode: Map<string, string>,
  ): Promise<number> {
    if (entries.length === 0) return 0;

    const data = entries.map((entry) => ({
      userId: userIdByCode.get(entry.employeeCode)!,
      date: entry.date,
      checkTime: entry.checkTime,
      source: 'excel-import',
    }));

    const result = await this.prisma.attendance.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  /** لیست ترددهای خام برای آنالیز، با فیلتر اختیاری کاربر و بازه تاریخی */
  findAll(query: AttendanceQueryDto) {
    return this.prisma.attendance.findMany({
      where: {
        userId: query.userId,
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: [{ userId: 'asc' }, { checkTime: 'asc' }],
    });
  }

  /** خلاصه روزانه: اولین و آخرین تردد هر کاربر در هر روز */
  async getDailySummary(query: AttendanceQueryDto) {
    let userIdFilter: string[] | undefined;

    if (query.search) {
      const matchedUsers = await this.prisma.user.findMany({
        where: { name: { contains: query.search, mode: 'insensitive' } },
        select: { id: true },
      });
      userIdFilter = matchedUsers.map((u) => u.id);
      if (userIdFilter.length === 0) return [];
    }

    const grouped = await this.prisma.attendance.groupBy({
      by: ['userId', 'date'],
      where: {
        userId: query.userId ?? (userIdFilter ? { in: userIdFilter } : undefined),
        date: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      _min: { checkTime: true },
      _max: { checkTime: true },
      _count: { checkTime: true },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });

    const userIds = [...new Set(grouped.map((g) => g.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    return grouped.map((g) => ({
      userId: g.userId,
      userName: nameById.get(g.userId) ?? null,
      date: g.date,
      firstCheckIn: g._min.checkTime,
      lastCheckOut: g._max.checkTime,
      totalEvents: g._count.checkTime,
    }));
  }
}