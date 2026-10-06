import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRepairDto } from './dto/create-repair.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { RepairStatusService } from './services/repair-status.service';
import { RepairCaseNumberService } from './services/repair-case-number.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepairStatus, RepairType, ScopeType } from 'src/generated/prisma/enums';
import { AuthenticatedUser } from 'src/common/interfaces/auth.interface';
import { UpdateRepairSlaPoliciesDto } from './dto/update-repair-sla-policies.dto';

// شکلی که PermissionGuard روی request.matchedPermission می‌گذارد
// (همان RolePermission منطبق‌شده، شامل scope و relationType)
interface MatchedPermission {
  scope: ScopeType;
  relationType?: string | null;
  [key: string]: any;
}

@Injectable()
export class RepairsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseNumberService: RepairCaseNumberService,
    private readonly statusService: RepairStatusService,
  ) {}

  async create(dto: CreateRepairDto) {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id: dto.customerId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const caseNumber = await this.caseNumberService.generate();
    const slaPolicy = await this.prisma.repairSlaPolicy.findUnique({ where: { type: dto.type } });
    const dueAt = slaPolicy?.isActive
      ? new Date(Date.now() + slaPolicy.targetHours * 3_600_000)
      : null;

    return this.prisma.repairCase.create({
      data: {
        caseNumber,

        customerId: dto.customerId,

        deviceTitle: dto.deviceTitle,

        serialNumber: dto.serialNumber,

        problemDescription: dto.problemDescription,

        type: dto.type,

        status: RepairStatus.REGISTERED,
        ...(dueAt ? { sla: { create: { dueAt } } } : {}),
      },

      include: {
        customer: true,
      },
    });
  }

  async getSlaPolicies() {
    const rows = await this.prisma.repairSlaPolicy.findMany({ orderBy: { type: 'asc' } });
    return rows;
  }

  async updateSlaPolicies(dto: UpdateRepairSlaPoliciesDto) {
    return this.prisma.$transaction(async (tx) => {
      const saved = [];
      for (const policy of dto.policies) {
        const row = await tx.repairSlaPolicy.upsert({
          where: { type: policy.type },
          create: { type: policy.type, targetHours: policy.targetHours, isActive: policy.isActive ?? true },
          update: { targetHours: policy.targetHours, isActive: policy.isActive ?? true },
        });
        saved.push(row);

        // Snapshot the first configured SLA for legacy cases. Existing snapshots are never rewritten.
        if (row.isActive) {
          const legacyCases = await tx.repairCase.findMany({
            where: { type: row.type, sla: { is: null } },
            select: { id: true, createdAt: true, completedAt: true },
          });
          if (legacyCases.length) {
            await tx.repairSla.createMany({
              data: legacyCases.map((repair) => {
                const dueAt = new Date(repair.createdAt.getTime() + row.targetHours * 3_600_000);
                return {
                  repairCaseId: repair.id,
                  dueAt,
                  completedAt: repair.completedAt,
                  isBreached: repair.completedAt ? repair.completedAt > dueAt : false,
                };
              }),
              skipDuplicates: true,
            });
          }
        }
      }
      return saved;
    });
  }

  // scope === SELF یعنی کاربر (تکنسین) فقط پرونده‌هایی را ببیند که
  // خودش بهشان ارجاع داده شده. هر scope بازتر یعنی همه‌ی پرونده‌ها
  // (چون RepairCase به دپارتمان وصل نیست، DEPARTMENT/SUBTREE/RELATED
  // برای این resource معادل دسترسی کامل در نظر گرفته می‌شوند).
  async findAll(
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
    const isSelfScoped = matchedPermission?.scope === ScopeType.SELF;

    return this.prisma.repairCase.findMany({
      where: isSelfScoped ? { technicianId: user.id } : undefined,

      include: {
        customer: true,
        technician: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private resolveAnalyticsRange(input: { range?: string; from?: string; to?: string }) {
    const now = new Date();
    let to = input.to ? new Date(input.to) : now;
    if (Number.isNaN(to.getTime())) to = now;
    let from: Date;
    if (input.from) {
      from = new Date(input.from);
      if (Number.isNaN(from.getTime())) from = new Date(to);
    } else {
      const days = input.range === '7d' ? 7 : input.range === '90d' ? 90 : 30;
      from = new Date(to);
      from.setDate(from.getDate() - (days - 1));
      from.setHours(0, 0, 0, 0);
    }
    if (from > to) [from, to] = [to, from];
    const duration = Math.max(1, to.getTime() - from.getTime());
    return { from, to, previousFrom: new Date(from.getTime() - duration), previousTo: new Date(from.getTime() - 1) };
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  async getAnalytics(
    user: AuthenticatedUser,
    matchedPermission: MatchedPermission | undefined,
    input: { range?: string; from?: string; to?: string },
  ) {
    const range = this.resolveAnalyticsRange(input);
    const scopeWhere = matchedPermission?.scope === ScopeType.SELF ? { technicianId: user.id } : {};
    const completedStatuses: RepairStatus[] = [
      RepairStatus.CLOSED,
      RepairStatus.DELIVERED,
      RepairStatus.NO_REPAIR_REQUIRED,
    ];
    const terminalStatuses: RepairStatus[] = [
      ...completedStatuses,
      RepairStatus.CANCELED,
      RepairStatus.REJECTED,
    ];
    const openStatuses = Object.values(RepairStatus).filter((status) => !terminalStatuses.includes(status));

    const [cases, previousCount, openCases, slaPolicies] = await Promise.all([
      this.prisma.repairCase.findMany({
        where: { ...scopeWhere, createdAt: { gte: range.from, lte: range.to } },
        include: {
          statusLogs: { orderBy: { createdAt: 'asc' } },
          visits: { orderBy: { scheduledAt: 'asc' } },
          technician: { select: { id: true, name: true } },
          sla: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.repairCase.count({
        where: { ...scopeWhere, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
      }),
      this.prisma.repairCase.findMany({
        where: { ...scopeWhere, status: { in: openStatuses }, createdAt: { lte: range.to } },
        select: { id: true, status: true, createdAt: true },
      }),
      this.prisma.repairSlaPolicy.findMany({ where: { isActive: true } }),
    ]);

    const effectiveStart = (repair: (typeof cases)[number]) =>
      repair.startedAt ?? repair.statusLogs.find((log) => log.newStatus === RepairStatus.IN_REPAIR)?.createdAt ?? null;
    const effectiveComplete = (repair: (typeof cases)[number]) =>
      repair.completedAt ?? repair.statusLogs.find((log) => completedStatuses.includes(log.newStatus))?.createdAt ?? null;

    const durations = cases.map((repair) => ({ repair, start: effectiveStart(repair), complete: effectiveComplete(repair) }));
    const mttr = durations
      .filter((x) => x.start && x.complete && x.complete >= x.start)
      .map((x) => (x.complete!.getTime() - x.start!.getTime()) / 86_400_000);
    const lead = durations
      .filter((x) => x.complete)
      .map((x) => (x.complete!.getTime() - x.repair.createdAt.getTime()) / 86_400_000);
    const timeToStart = durations
      .filter((x) => x.start)
      .map((x) => (x.start!.getTime() - x.repair.createdAt.getTime()) / 3_600_000);

    const average = (values: number[]) =>
      values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;

    const statusMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const createdMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    for (const row of durations) {
      statusMap.set(row.repair.status, (statusMap.get(row.repair.status) ?? 0) + 1);
      typeMap.set(row.repair.type, (typeMap.get(row.repair.type) ?? 0) + 1);
      const createdKey = this.dateKey(row.repair.createdAt);
      createdMap.set(createdKey, (createdMap.get(createdKey) ?? 0) + 1);
      if (row.complete) {
        const completedKey = this.dateKey(row.complete);
        completedMap.set(completedKey, (completedMap.get(completedKey) ?? 0) + 1);
      }
    }

    const trend: { date: string; created: number; completed: number }[] = [];
    const cursor = new Date(range.from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.to);
    end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      const key = this.dateKey(cursor);
      trend.push({ date: key, created: createdMap.get(key) ?? 0, completed: completedMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const completed = cases.filter((x) => completedStatuses.includes(x.status)).length;
    const open = cases.filter((x) => openStatuses.includes(x.status)).length;
    const canceledOrRejected = cases.filter((x) => x.status === RepairStatus.CANCELED || x.status === RepairStatus.REJECTED).length;

    // Phase 2: aging of every currently open repair (not only cases created inside the selected range).
    const aging = [
      { key: 'LT_1D', label: 'کمتر از ۱ روز', count: 0 },
      { key: 'D1_3', label: '۱ تا ۳ روز', count: 0 },
      { key: 'D3_7', label: '۳ تا ۷ روز', count: 0 },
      { key: 'D7_14', label: '۷ تا ۱۴ روز', count: 0 },
      { key: 'GTE_14', label: '۱۴ روز و بیشتر', count: 0 },
    ];
    for (const repair of openCases) {
      const days = Math.max(0, (range.to.getTime() - repair.createdAt.getTime()) / 86_400_000);
      if (days < 1) aging[0].count += 1;
      else if (days < 3) aging[1].count += 1;
      else if (days < 7) aging[2].count += 1;
      else if (days < 14) aging[3].count += 1;
      else aging[4].count += 1;
    }

    // Phase 2: reconstruct time spent in every repair status from status logs.
    const statusDurations = new Map<string, number[]>();
    for (const repair of cases) {
      let currentStatus: RepairStatus = RepairStatus.REGISTERED;
      let startedAt = repair.createdAt;
      const logs = repair.statusLogs.filter((log) => log.createdAt >= repair.createdAt);
      for (const log of logs) {
        const hours = (log.createdAt.getTime() - startedAt.getTime()) / 3_600_000;
        if (hours >= 0) {
          const list = statusDurations.get(currentStatus) ?? [];
          list.push(hours);
          statusDurations.set(currentStatus, list);
        }
        currentStatus = log.newStatus;
        startedAt = log.createdAt;
      }
      const effectiveEnd = effectiveComplete(repair) ?? (terminalStatuses.includes(repair.status) ? repair.updatedAt : range.to);
      if (effectiveEnd >= startedAt) {
        const hours = (effectiveEnd.getTime() - startedAt.getTime()) / 3_600_000;
        const list = statusDurations.get(currentStatus) ?? [];
        list.push(hours);
        statusDurations.set(currentStatus, list);
      }
    }
    const statusDuration = [...statusDurations.entries()]
      .map(([status, values]) => ({ status, averageHours: average(values) ?? 0, samples: values.length }))
      .sort((a, b) => b.averageHours - a.averageHours);

    // Phase 2: technician workload and operational performance.
    const technicianMap = new Map<string, {
      id: string; name: string; assigned: number; open: number; completed: number;
      mttr: number[]; visits: number; secondVisitCases: number; visitedCases: number; firstVisitFixed: number;
    }>();
    for (const row of durations) {
      const technician = row.repair.technician;
      if (!technician) continue;
      const item = technicianMap.get(technician.id) ?? {
        id: technician.id, name: technician.name, assigned: 0, open: 0, completed: 0,
        mttr: [], visits: 0, secondVisitCases: 0, visitedCases: 0, firstVisitFixed: 0,
      };
      item.assigned += 1;
      if (openStatuses.includes(row.repair.status)) item.open += 1;
      if (completedStatuses.includes(row.repair.status)) item.completed += 1;
      if (row.start && row.complete && row.complete >= row.start) {
        item.mttr.push((row.complete.getTime() - row.start.getTime()) / 86_400_000);
      }
      item.visits += row.repair.visits.length;
      if (row.repair.visits.length) {
        item.visitedCases += 1;
        if (row.repair.visits[0]?.result === 'REPAIRED') item.firstVisitFixed += 1;
        if (row.repair.visits.length > 1 || row.repair.visits[0]?.result === 'NEED_SECOND_VISIT') item.secondVisitCases += 1;
      }
      technicianMap.set(technician.id, item);
    }
    const technicians = [...technicianMap.values()]
      .map((item) => ({
        id: item.id,
        name: item.name,
        assigned: item.assigned,
        open: item.open,
        completed: item.completed,
        mttrDays: average(item.mttr),
        visits: item.visits,
        firstVisitFixRate: item.visitedCases ? Number(((item.firstVisitFixed / item.visitedCases) * 100).toFixed(1)) : null,
        secondVisitRate: item.visitedCases ? Number(((item.secondVisitCases / item.visitedCases) * 100).toFixed(1)) : null,
      }))
      .sort((a, b) => b.assigned - a.assigned);

    // Phase 2: visit outcome analytics.
    const allVisits = cases.flatMap((repair) => repair.visits);
    const visitResultMap = new Map<string, number>();
    for (const visit of allVisits) visitResultMap.set(visit.result, (visitResultMap.get(visit.result) ?? 0) + 1);
    const casesWithVisits = cases.filter((repair) => repair.visits.length > 0);
    const firstVisitFixedCases = casesWithVisits.filter((repair) => repair.visits[0]?.result === 'REPAIRED').length;
    const secondVisitCases = casesWithVisits.filter((repair) => repair.visits.length > 1 || repair.visits[0]?.result === 'NEED_SECOND_VISIT').length;

    // Phase 3: SLA analytics. Persisted per-case SLA is preferred; old cases fall back to the active type policy.
    const policyByType = new Map(slaPolicies.map((policy) => [policy.type, policy]));
    const slaRows = durations.flatMap((row) => {
      if (row.repair.status === RepairStatus.CANCELED || row.repair.status === RepairStatus.REJECTED) return [];
      const policy = policyByType.get(row.repair.type);
      const dueAt = row.repair.sla?.dueAt ?? (policy ? new Date(row.repair.createdAt.getTime() + policy.targetHours * 3_600_000) : null);
      if (!dueAt) return [];
      const endAt = row.complete ?? range.to;
      const breached = endAt > dueAt;
      const overdueHours = breached ? (endAt.getTime() - dueAt.getTime()) / 3_600_000 : 0;
      return [{ type: row.repair.type, technicianId: row.repair.technician?.id ?? null, technicianName: row.repair.technician?.name ?? null, createdAt: row.repair.createdAt, dueAt, completedAt: row.complete, breached, overdueHours }];
    });
    const slaBreached = slaRows.filter((row) => row.breached).length;
    const slaWithin = slaRows.length - slaBreached;
    const overdueValues = slaRows.filter((row) => row.breached).map((row) => row.overdueHours);
    const slaByType = Object.values(RepairType).map((type) => {
      const rows = slaRows.filter((row) => row.type === type);
      const breached = rows.filter((row) => row.breached).length;
      return {
        type, total: rows.length, within: rows.length - breached, breached,
        complianceRate: rows.length ? Number((((rows.length - breached) / rows.length) * 100).toFixed(1)) : null,
        averageOverdueHours: average(rows.filter((row) => row.breached).map((row) => row.overdueHours)),
      };
    });
    const slaTechnicianMap = new Map<string, { id: string; name: string; total: number; breached: number; overdue: number[] }>();
    for (const row of slaRows) {
      if (!row.technicianId || !row.technicianName) continue;
      const item = slaTechnicianMap.get(row.technicianId) ?? { id: row.technicianId, name: row.technicianName, total: 0, breached: 0, overdue: [] };
      item.total += 1;
      if (row.breached) { item.breached += 1; item.overdue.push(row.overdueHours); }
      slaTechnicianMap.set(row.technicianId, item);
    }
    const slaByTechnician = [...slaTechnicianMap.values()].map((item) => ({
      id: item.id, name: item.name, total: item.total, within: item.total - item.breached, breached: item.breached,
      complianceRate: item.total ? Number((((item.total - item.breached) / item.total) * 100).toFixed(1)) : null,
      averageOverdueHours: average(item.overdue),
    })).sort((a, b) => b.total - a.total);

    const slaTrendMap = new Map<string, { total: number; breached: number }>();
    for (const row of slaRows) {
      const key = this.dateKey(row.createdAt);
      const item = slaTrendMap.get(key) ?? { total: 0, breached: 0 };
      item.total += 1;
      if (row.breached) item.breached += 1;
      slaTrendMap.set(key, item);
    }
    const slaTrend = trend.map((point) => {
      const item = slaTrendMap.get(point.date) ?? { total: 0, breached: 0 };
      return { date: point.date, total: item.total, breached: item.breached, complianceRate: item.total ? Number((((item.total - item.breached) / item.total) * 100).toFixed(1)) : null };
    });

    return {
      range: { from: range.from, to: range.to },
      kpis: {
        total: cases.length,
        totalChangePct: this.percentChange(cases.length, previousCount),
        open,
        completed,
        canceledOrRejected,
        mttrDays: average(mttr),
        leadTimeDays: average(lead),
        timeToStartHours: average(timeToStart),
      },
      trend,
      statusDistribution: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
      typeDistribution: [...typeMap.entries()].map(([type, count]) => ({ type, count })),
      aging,
      statusDuration,
      technicians,
      sla: {
        configured: slaPolicies.length > 0 || slaRows.length > 0,
        assessed: slaRows.length,
        within: slaWithin,
        breached: slaBreached,
        complianceRate: slaRows.length ? Number(((slaWithin / slaRows.length) * 100).toFixed(1)) : null,
        averageOverdueHours: average(overdueValues),
        byType: slaByType,
        byTechnician: slaByTechnician,
        trend: slaTrend,
        policies: slaPolicies.map((policy) => ({ type: policy.type, targetHours: policy.targetHours, isActive: policy.isActive })),
      },
      visits: {
        total: allVisits.length,
        casesWithVisits: casesWithVisits.length,
        firstVisitFixRate: casesWithVisits.length ? Number(((firstVisitFixedCases / casesWithVisits.length) * 100).toFixed(1)) : null,
        secondVisitRate: casesWithVisits.length ? Number(((secondVisitCases / casesWithVisits.length) * 100).toFixed(1)) : null,
        resultDistribution: [...visitResultMap.entries()].map(([result, count]) => ({ result, count })),
      },
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { id },

      include: {
        customer: true,
        technician: true,
        visits: true,
        parts: true,
        statusLogs: {
          include: {
            changedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!repair) {
      throw new NotFoundException('Repair case not found');
    }

    this.assertCanAccessRepair(repair.technicianId, user, matchedPermission);

    return repair;
  }

  async assignTechnician(repairId: string, dto: AssignTechnicianDto) {
    const repair = await this.prisma.repairCase.findUnique({
      where: {
        id: repairId,
      },
    });

    if (!repair) {
      throw new NotFoundException('Repair case not found');
    }

    const technician = await this.prisma.user.findUnique({
      where: {
        id: dto.technicianId,
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.prisma.repairCase.update({
      where: {
        id: repairId,
      },

      data: {
        technicianId: dto.technicianId,
      },

      include: {
        technician: true,
      },
    });
  }

  async changeStatus(
    repairId: string,
    newStatus: RepairStatus,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
    reason?: string,
  ) {
    const repair = await this.prisma.repairCase.findUnique({
      where: { id: repairId },
    });

    if (!repair) {
      throw new NotFoundException('Repair not found');
    }

    this.assertCanAccessRepair(repair.technicianId, user, matchedPermission);

    // 1. Validate State Machine
    this.statusService.validateTransition(repair.status, newStatus);

    return this.prisma.$transaction(async (tx) => {
      // 2. Update Repair
      const updated = await tx.repairCase.update({
        where: { id: repairId },
        data: {
          status: newStatus,
          ...(newStatus === RepairStatus.IN_REPAIR && !repair.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...([RepairStatus.CLOSED, RepairStatus.DELIVERED, RepairStatus.NO_REPAIR_REQUIRED].includes(newStatus) && !repair.completedAt
            ? { completedAt: new Date() }
            : {}),
        },
      });

      // 3. Log
      await tx.repairStatusLog.create({
        data: {
          repairCaseId: repairId,
          oldStatus: repair.status,
          newStatus,
          changedById: user.id,
          reason,
        },
      });

      // Phase 3: freeze SLA result when a repair reaches a successful terminal state.
      if ([RepairStatus.CLOSED, RepairStatus.DELIVERED, RepairStatus.NO_REPAIR_REQUIRED].includes(newStatus)) {
        const completedAt = updated.completedAt ?? new Date();
        const sla = await tx.repairSla.findUnique({ where: { repairCaseId: repairId } });
        if (sla) {
          await tx.repairSla.update({
            where: { repairCaseId: repairId },
            data: { completedAt, isBreached: completedAt > sla.dueAt },
          });
        } else {
          const policy = await tx.repairSlaPolicy.findUnique({ where: { type: repair.type } });
          if (policy?.isActive) {
            const dueAt = new Date(repair.createdAt.getTime() + policy.targetHours * 3_600_000);
            await tx.repairSla.create({
              data: { repairCaseId: repairId, dueAt, completedAt, isBreached: completedAt > dueAt },
            });
          }
        }
      }

      // 4. Notification Event (future integration)
      await tx.notificationEvent.create({
        data: {
          repairCaseId: repairId,
          status: newStatus,
          payload: {
            oldStatus: repair.status,
            newStatus,
            reason: reason ?? null,
          },
        },
      });

      return updated;
    });
  }

  // معادل evaluateScope در PermissionGuard، اما برای repairCase.technicianId
  // به‌جای targetUserId. هم‌فلسفه‌ی همان گارد: SELF یعنی فقط خود تکنسین،
  // بقیه‌ی scope ها (چون این resource دپارتمان‌محور نیست) یعنی دسترسی کامل.
  private assertCanAccessRepair(
    technicianId: string | null,
    user: AuthenticatedUser,
    matchedPermission?: MatchedPermission,
  ) {
    if (
      matchedPermission?.scope === ScopeType.SELF &&
      technicianId !== user.id
    ) {
      throw new ForbiddenException(
        'Permission denied: scope SELF does not cover this repair case',
      );
    }
  }
}
