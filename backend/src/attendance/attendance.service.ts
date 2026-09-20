import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceImportResultDto } from './dto/attendance-import-result.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import {
  parseAttendanceWorkbook,
  ParsedAttendanceEntry,
} from './attendance-parser';

const LATE_AFTER_HOUR = 8;
const LATE_AFTER_MINUTE = 30;
const EARLY_BEFORE_HOUR = 16;
const EARLY_BEFORE_MINUTE = 0;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromExcel(buffer: Buffer): Promise<AttendanceImportResultDto> {
    const { entries } = parseAttendanceWorkbook(buffer);
    const employeeCodes = [...new Set(entries.map((e) => e.employeeCode))];
    const users = await this.prisma.user.findMany({
      where: { employeeCode: { in: employeeCodes } },
      select: { id: true, employeeCode: true },
    });
    const userIdByCode = new Map(users.map((u) => [u.employeeCode as string, u.id]));
    const unmatchedEmployeeCodes = employeeCodes.filter((code) => !userIdByCode.has(code));
    const matchedEntries = entries.filter((e) => userIdByCode.has(e.employeeCode));
    const recordsCreated = await this.persistEntries(matchedEntries, userIdByCode);

    return {
      totalRowsProcessed: entries.length,
      matchedUsers: userIdByCode.size,
      unmatchedEmployeeCodes,
      recordsCreated,
      recordsSkippedExisting: matchedEntries.length - recordsCreated,
      invalidTimeEntries: 0,
    };
  }

  private async persistEntries(
    entries: ParsedAttendanceEntry[],
    userIdByCode: Map<string, string>,
  ): Promise<number> {
    if (entries.length === 0) return 0;
    const result = await this.prisma.attendance.createMany({
      data: entries.map((entry) => ({
        userId: userIdByCode.get(entry.employeeCode)!,
        date: entry.date,
        checkTime: entry.checkTime,
        source: 'excel-import',
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  private userWhere(query: AttendanceQueryDto) {
    return {
      id: query.userId,
      departmentId: query.departmentId,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
  }

  private dateWhere(query: AttendanceQueryDto) {
    return {
      gte: query.from ? new Date(query.from) : undefined,
      lte: query.to ? new Date(query.to) : undefined,
    };
  }

  findAll(query: AttendanceQueryDto) {
    return this.prisma.attendance.findMany({
      where: {
        userId: query.userId,
        user: this.userWhere(query),
        date: this.dateWhere(query),
      },
      orderBy: [{ userId: 'asc' }, { checkTime: 'asc' }],
    });
  }

  async getDailySummary(query: AttendanceQueryDto) {
    const users = await this.prisma.user.findMany({
      where: this.userWhere(query),
      select: { id: true, name: true, department: { select: { id: true, name: true } } },
    });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const grouped = await this.prisma.attendance.groupBy({
      by: ['userId', 'date'],
      where: {
        userId: { in: userIds },
        date: this.dateWhere(query),
      },
      _min: { checkTime: true },
      _max: { checkTime: true },
      _count: { checkTime: true },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });

    const userById = new Map(users.map((u) => [u.id, u]));
    return grouped.map((g) => {
      const user = userById.get(g.userId);
      return {
        userId: g.userId,
        userName: user?.name ?? null,
        departmentId: user?.department.id ?? null,
        departmentName: user?.department.name ?? null,
        date: g.date,
        firstCheckIn: g._min.checkTime,
        lastCheckOut: g._max.checkTime,
        totalEvents: g._count.checkTime,
        workedMinutes: this.diffMinutes(g._min.checkTime, g._max.checkTime),
        lateArrival: this.isAfter(g._min.checkTime, LATE_AFTER_HOUR, LATE_AFTER_MINUTE),
        earlyDeparture: this.isBefore(g._max.checkTime, EARLY_BEFORE_HOUR, EARLY_BEFORE_MINUTE),
        incomplete: g._count.checkTime < 2,
      };
    });
  }

  async getReport(query: AttendanceQueryDto) {
    const summary = await this.getDailySummary(query);
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    const totalMinutes = summary.reduce((sum, row) => sum + row.workedMinutes, 0);
    const lateCount = summary.filter((row) => row.lateArrival).length;
    const earlyCount = summary.filter((row) => row.earlyDeparture).length;
    const incompleteCount = summary.filter((row) => row.incomplete).length;
    const uniqueUsers = new Set(summary.map((row) => row.userId)).size;

    const dailyMap = new Map<string, { date: string; people: Set<string>; minutes: number; late: number; incomplete: number }>();
    const departmentMap = new Map<string, { departmentId: string | null; departmentName: string; people: Set<string>; days: number; minutes: number; late: number; early: number; incomplete: number }>();
    const userMap = new Map<string, { userId: string; userName: string; departmentName: string; days: number; minutes: number; late: number; early: number; incomplete: number }>();

    for (const row of summary) {
      const date = row.date.toISOString().slice(0, 10);
      const daily = dailyMap.get(date) ?? { date, people: new Set<string>(), minutes: 0, late: 0, incomplete: 0 };
      daily.people.add(row.userId);
      daily.minutes += row.workedMinutes;
      daily.late += row.lateArrival ? 1 : 0;
      daily.incomplete += row.incomplete ? 1 : 0;
      dailyMap.set(date, daily);

      const departmentKey = row.departmentId ?? 'none';
      const dep = departmentMap.get(departmentKey) ?? {
        departmentId: row.departmentId,
        departmentName: row.departmentName ?? 'بدون دپارتمان',
        people: new Set<string>(), days: 0, minutes: 0, late: 0, early: 0, incomplete: 0,
      };
      dep.people.add(row.userId);
      dep.days += 1;
      dep.minutes += row.workedMinutes;
      dep.late += row.lateArrival ? 1 : 0;
      dep.early += row.earlyDeparture ? 1 : 0;
      dep.incomplete += row.incomplete ? 1 : 0;
      departmentMap.set(departmentKey, dep);

      const user = userMap.get(row.userId) ?? {
        userId: row.userId,
        userName: row.userName ?? 'بدون نام',
        departmentName: row.departmentName ?? 'بدون دپارتمان',
        days: 0, minutes: 0, late: 0, early: 0, incomplete: 0,
      };
      user.days += 1;
      user.minutes += row.workedMinutes;
      user.late += row.lateArrival ? 1 : 0;
      user.early += row.earlyDeparture ? 1 : 0;
      user.incomplete += row.incomplete ? 1 : 0;
      userMap.set(row.userId, user);
    }

    const dailyTrend = [...dailyMap.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        presentUsers: item.people.size,
        totalHours: this.round(item.minutes / 60),
        averageHours: item.people.size ? this.round(item.minutes / 60 / item.people.size) : 0,
        lateCount: item.late,
        incompleteCount: item.incomplete,
      }));

    const departmentStats = [...departmentMap.values()]
      .map((item) => ({
        departmentId: item.departmentId,
        departmentName: item.departmentName,
        uniqueUsers: item.people.size,
        attendanceDays: item.days,
        totalHours: this.round(item.minutes / 60),
        averageHoursPerDay: item.days ? this.round(item.minutes / 60 / item.days) : 0,
        lateCount: item.late,
        earlyDepartureCount: item.early,
        incompleteCount: item.incomplete,
      }))
      .sort((a, b) => b.attendanceDays - a.attendanceDays);

    const userStats = [...userMap.values()]
      .map((item) => ({
        ...item,
        totalHours: this.round(item.minutes / 60),
        averageHoursPerDay: item.days ? this.round(item.minutes / 60 / item.days) : 0,
      }))
      .map(({ minutes: _minutes, ...item }) => item)
      .sort((a, b) => b.days - a.days || b.totalHours - a.totalHours);

    return {
      generatedAt: new Date(),
      assumptions: {
        lateAfter: `${String(LATE_AFTER_HOUR).padStart(2, '0')}:${String(LATE_AFTER_MINUTE).padStart(2, '0')}`,
        earlyBefore: `${String(EARLY_BEFORE_HOUR).padStart(2, '0')}:${String(EARLY_BEFORE_MINUTE).padStart(2, '0')}`,
        workedTimeDefinition: 'فاصله اولین تا آخرین تردد ثبت‌شده در هر روز',
      },
      overview: {
        attendanceDays: summary.length,
        uniqueUsers,
        totalHours: this.round(totalMinutes / 60),
        averageHoursPerAttendanceDay: summary.length ? this.round(totalMinutes / 60 / summary.length) : 0,
        lateCount,
        earlyDepartureCount: earlyCount,
        incompleteCount,
      },
      departments,
      dailyTrend,
      departmentStats,
      userStats,
      records: summary,
    };
  }

  private diffMinutes(first: Date | null, last: Date | null) {
    if (!first || !last || last <= first) return 0;
    return Math.round((last.getTime() - first.getTime()) / 60000);
  }

  private isAfter(date: Date | null, hour: number, minute: number) {
    if (!date) return false;
    return date.getUTCHours() * 60 + date.getUTCMinutes() > hour * 60 + minute;
  }

  private isBefore(date: Date | null, hour: number, minute: number) {
    if (!date) return false;
    return date.getUTCHours() * 60 + date.getUTCMinutes() < hour * 60 + minute;
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }
}
