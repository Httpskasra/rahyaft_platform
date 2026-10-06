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
private readonly completedStatuses: RepairStatus[] = [
  RepairStatus.CLOSED,
  RepairStatus.DELIVERED,
  RepairStatus.NO_REPAIR_REQUIRED,
];
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

    const slaPolicy = await this.prisma.repairSlaPolicy.findUnique({
      where: { type: dto.type },
    });
    const createdAt = new Date();
    const dueAt = slaPolicy?.isActive
      ? new Date(createdAt.getTime() + slaPolicy.targetHours * 3_600_000)
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
        createdAt,
        ...(dueAt && slaPolicy
          ? { sla: { create: { targetHours: slaPolicy.targetHours, dueAt } } }
          : {}),
      },
      include: {
        customer: true,
        sla: true,
      },
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

  private makeInsight(input: {
    id: string; category: string; severity: 'info' | 'warning' | 'critical' | 'positive';
    title: string; message: string; recommendation?: string; evidence?: string[];
    metric?: string; current?: number | null; previous?: number | null; changePct?: number | null;
  }) { return input; }

  private dailyRepairSpikeAnomalies(series: { date: string; created: number; completed: number }[]) {
    if (series.length < 7) return [];
    const values = series.map((item) => item.created);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean < 1) return [];
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    if (std === 0) return [];
    return series.map((item) => ({ ...item, zScore: (item.created - mean) / std }))
      .filter((item) => item.zScore >= 2 && item.created >= Math.max(3, mean * 1.5))
      .sort((a, b) => b.zScore - a.zScore).slice(0, 5)
      .map((item) => ({
        id: `repair-spike-${item.date}`, kind: 'SPIKE', severity: item.zScore >= 3 ? 'critical' : 'warning',
        date: item.date, metric: 'createdRepairs', actual: item.created, baseline: Number(mean.toFixed(1)), zScore: Number(item.zScore.toFixed(2)),
        message: `تعداد پرونده‌های تعمیر ثبت‌شده در ${item.date} به‌طور غیرعادی بالاتر از الگوی بازه بوده است.`,
      }));
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

    const [cases, previousCases, openCases, slaPolicies] = await Promise.all([
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
      this.prisma.repairCase.findMany({
        where: { ...scopeWhere, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
        include: {
          statusLogs: { orderBy: { createdAt: 'asc' } },
          visits: { orderBy: { scheduledAt: 'asc' } },
          sla: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.repairCase.findMany({
        where: { ...scopeWhere, status: { in: openStatuses }, createdAt: { lte: range.to } },
        select: { id: true, status: true, createdAt: true },
      }),
      this.prisma.repairSlaPolicy.findMany({ where: { isActive: true } }),
    ]);
    const previousCount = previousCases.length;

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

    const previousEffectiveStart = (repair: (typeof previousCases)[number]) =>
      repair.startedAt ?? repair.statusLogs.find((log) => log.newStatus === RepairStatus.IN_REPAIR)?.createdAt ?? null;
    const previousEffectiveComplete = (repair: (typeof previousCases)[number]) =>
      repair.completedAt ?? repair.statusLogs.find((log) => completedStatuses.includes(log.newStatus))?.createdAt ?? null;
    const previousDurations = previousCases.map((repair) => ({ repair, start: previousEffectiveStart(repair), complete: previousEffectiveComplete(repair) }));
    const previousMttrValues = previousDurations.filter((x) => x.start && x.complete && x.complete >= x.start)
      .map((x) => (x.complete!.getTime() - x.start!.getTime()) / 86_400_000);
    const previousLeadValues = previousDurations.filter((x) => x.complete)
      .map((x) => (x.complete!.getTime() - x.repair.createdAt.getTime()) / 86_400_000);
    const previousMttr = average(previousMttrValues);
    const previousLead = average(previousLeadValues);

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
      const item: {
        id: string; name: string; assigned: number; open: number; completed: number;
        mttr: number[]; visits: number; secondVisitCases: number; visitedCases: number; firstVisitFixed: number;
      } = technicianMap.get(technician.id) ?? {
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

    // Phase 3: SLA analytics. A case-specific SLA snapshot wins; older cases fall back to the current type policy.
    const policyMap = new Map(slaPolicies.map((policy) => [policy.type, policy]));
    const slaRows = durations.flatMap((row) => {
      if (row.repair.status === RepairStatus.CANCELED || row.repair.status === RepairStatus.REJECTED) return [];
      const policy = policyMap.get(row.repair.type);
      const targetHours = row.repair.sla?.targetHours ?? policy?.targetHours ?? null;
      if (!targetHours) return [];
      const dueAt = row.repair.sla?.dueAt ?? new Date(row.repair.createdAt.getTime() + targetHours * 3_600_000);
      const endAt = row.complete ?? range.to;
      const overdueHours = Math.max(0, (endAt.getTime() - dueAt.getTime()) / 3_600_000);
      const breached = overdueHours > 0;
      const remainingHours = row.complete ? null : (dueAt.getTime() - range.to.getTime()) / 3_600_000;
      const atRisk = !row.complete && !breached && remainingHours != null && remainingHours <= Math.max(2, targetHours * 0.25);
      return [{
        repairId: row.repair.id, caseNumber: row.repair.caseNumber, deviceTitle: row.repair.deviceTitle,
        type: row.repair.type, status: row.repair.status, technician: row.repair.technician?.name ?? null,
        targetHours, dueAt, completedAt: row.complete, breached, atRisk,
        elapsedHours: Number(((endAt.getTime() - row.repair.createdAt.getTime()) / 3_600_000).toFixed(1)),
        overdueHours: Number(overdueHours.toFixed(1)),
      }];
    });
    const slaBreached = slaRows.filter((row) => row.breached).length;
    const slaCompliant = slaRows.length - slaBreached;
    const overdueValues = slaRows.filter((row) => row.breached).map((row) => row.overdueHours);
    const slaTrendMap = new Map<string, { compliant: number; breached: number }>();
    for (const row of slaRows) {
      const repair = cases.find((item) => item.id === row.repairId)!;
      const key = this.dateKey(repair.createdAt);
      const bucket = slaTrendMap.get(key) ?? { compliant: 0, breached: 0 };
      row.breached ? bucket.breached++ : bucket.compliant++;
      slaTrendMap.set(key, bucket);
    }
    const slaTrend = trend.map((point) => ({ date: point.date, ...(slaTrendMap.get(point.date) ?? { compliant: 0, breached: 0 }) }));
    const slaByType = Object.values(RepairType).map((type) => {
      const rows = slaRows.filter((row) => row.type === type);
      const breached = rows.filter((row) => row.breached).length;
      return { type, targetHours: policyMap.get(type)?.targetHours ?? null, eligible: rows.length, compliant: rows.length - breached, breached, complianceRate: rows.length ? Number((((rows.length - breached) / rows.length) * 100).toFixed(1)) : null };
    });

    // Phase 4: deterministic insight + anomaly engine (no LLM).
    const anomalies = this.dailyRepairSpikeAnomalies(trend);
    const insights = [] as ReturnType<RepairsService['makeInsight']>[];
    const currentMttr = average(mttr);
    const currentLead = average(lead);
    if (cases.length >= 5 && previousCount >= 5) {
      const volumeChange = this.percentChange(cases.length, previousCount);
      if (volumeChange != null && Math.abs(volumeChange) >= 30) insights.push(this.makeInsight({
        id: 'repair-volume-change', category: 'VOLUME', severity: Math.abs(volumeChange) >= 60 ? 'warning' : 'info',
        title: volumeChange > 0 ? 'افزایش حجم تعمیرات' : 'کاهش حجم تعمیرات',
        message: `تعداد پرونده‌های جدید نسبت به بازه قبل ${Math.abs(volumeChange)}٪ ${volumeChange > 0 ? 'افزایش' : 'کاهش'} داشته است.`,
        evidence: [`جاری: ${cases.length} پرونده`, `قبل: ${previousCount} پرونده`], metric: 'repairVolume', current: cases.length, previous: previousCount, changePct: volumeChange,
      }));
    }
    if (currentMttr != null && previousMttr != null && mttr.length >= 3 && previousMttrValues.length >= 3) {
      const mttrChange = this.percentChange(currentMttr, previousMttr);
      if (mttrChange != null && mttrChange >= 30) insights.push(this.makeInsight({
        id: 'repair-mttr-rise', category: 'PERFORMANCE', severity: mttrChange >= 70 ? 'critical' : 'warning',
        title: 'افزایش MTTR', message: `میانگین زمان تعمیر نسبت به بازه قبل ${mttrChange}٪ افزایش یافته است.`,
        recommendation: 'Status Duration و پرونده‌های دارای انتظار قطعه/تأیید هزینه را بررسی کنید.',
        evidence: [`جاری: ${currentMttr} روز`, `قبل: ${previousMttr} روز`], metric: 'mttrDays', current: currentMttr, previous: previousMttr, changePct: mttrChange,
      }));
    }
    if (slaRows.length >= 5 && slaRows.length && slaCompliant / slaRows.length < 0.9) insights.push(this.makeInsight({
      id: 'repair-sla-low', category: 'SLA', severity: slaCompliant / slaRows.length < 0.7 ? 'critical' : 'warning',
      title: 'رعایت SLA پایین است', message: `${Number((slaCompliant / slaRows.length * 100).toFixed(1))}٪ از پرونده‌های ارزیابی‌شده داخل SLA بوده‌اند.`,
      recommendation: 'نوع تعمیر و Statusهایی که بیشترین زمان را مصرف می‌کنند بررسی کنید و ظرفیت عملیاتی یا SLA را اصلاح کنید.',
      evidence: [`${slaBreached} نقض از ${slaRows.length} مورد`, `میانگین تأخیر: ${average(overdueValues) ?? 0} ساعت`], metric: 'slaCompliance', current: Number((slaCompliant / slaRows.length * 100).toFixed(1)),
    }));
    const oldOpen = aging.find((item) => item.key === 'GTE_14')?.count ?? 0;
    if (openCases.length >= 5 && oldOpen >= Math.max(2, Math.ceil(openCases.length * 0.15))) insights.push(this.makeInsight({
      id: 'repair-aging-backlog', category: 'BACKLOG', severity: oldOpen / openCases.length >= 0.3 ? 'critical' : 'warning',
      title: 'انباشت پرونده‌های قدیمی', message: `${oldOpen} پرونده باز بیش از ۱۴ روز سن دارند.`,
      recommendation: 'این پرونده‌ها را بر اساس علت توقف، قطعه، تأیید هزینه و تکنسین دسته‌بندی و برایشان برنامه رفع backlog تعیین کنید.',
      evidence: [`${Number((oldOpen / openCases.length * 100).toFixed(1))}٪ از پرونده‌های باز بیش از ۱۴ روزه‌اند`], metric: 'agedOpenRepairs', current: oldOpen,
    }));
    const slowestStatus = statusDuration.filter((item) => item.samples >= 3).sort((a, b) => b.averageHours - a.averageHours)[0];
    if (slowestStatus && slowestStatus.averageHours >= 8) insights.push(this.makeInsight({
      id: `repair-status-bottleneck-${slowestStatus.status}`, category: 'BOTTLENECK', severity: slowestStatus.averageHours >= 24 ? 'critical' : 'warning',
      title: 'گلوگاه در چرخه تعمیر', message: `وضعیت ${slowestStatus.status} با میانگین ${slowestStatus.averageHours} ساعت بیشترین زمان ماندگاری را دارد.`,
      recommendation: 'پرونده‌های این وضعیت را Drill-down کنید و علت‌های پرتکرار توقف را جداگانه اندازه‌گیری کنید.',
      evidence: [`${slowestStatus.samples} نمونه`, `میانگین ${slowestStatus.averageHours} ساعت`], metric: 'statusDurationHours', current: slowestStatus.averageHours,
    }));
    if (casesWithVisits.length >= 5 && secondVisitCases / casesWithVisits.length >= 0.2) insights.push(this.makeInsight({
      id: 'repair-second-visit-high', category: 'QUALITY', severity: secondVisitCases / casesWithVisits.length >= 0.35 ? 'critical' : 'warning',
      title: 'نرخ مراجعه دوم بالاست', message: `${Number((secondVisitCases / casesWithVisits.length * 100).toFixed(1))}٪ از پرونده‌های دارای مراجعه، نیاز به مراجعه دوم داشته‌اند.`,
      recommendation: 'دلایل NEED_PART و NEED_SECOND_VISIT را بررسی و آمادگی قطعه/تشخیص قبل از اعزام را تقویت کنید.',
      evidence: [`${secondVisitCases} مورد از ${casesWithVisits.length} پرونده دارای مراجعه`], metric: 'secondVisitRate', current: Number((secondVisitCases / casesWithVisits.length * 100).toFixed(1)),
    }));
    const activeTechnicians = technicians.filter((item) => item.assigned >= 2);
    if (activeTechnicians.length >= 2) {
      const avgOpen = activeTechnicians.reduce((sum, item) => sum + item.open, 0) / activeTechnicians.length;
      const overloaded = activeTechnicians.filter((item) => avgOpen >= 1 && item.open >= Math.max(3, avgOpen * 1.75)).sort((a, b) => b.open - a.open)[0];
      if (overloaded) insights.push(this.makeInsight({
        id: `repair-workload-${overloaded.id}`, category: 'WORKLOAD', severity: overloaded.open >= avgOpen * 2.5 ? 'critical' : 'warning',
        title: 'عدم توازن بار کاری', message: `${overloaded.name} دارای ${overloaded.open} پرونده باز است؛ میانگین تکنسین‌های فعال ${Number(avgOpen.toFixed(1))} پرونده است.`,
        recommendation: 'پرونده‌های جدید را با توجه به تخصص و ظرفیت بین تکنسین‌های کم‌بارتر توزیع کنید.',
        evidence: [`بار باز ${overloaded.name}: ${overloaded.open}`, `میانگین تیم: ${Number(avgOpen.toFixed(1))}`], metric: 'technicianOpenWorkload', current: overloaded.open, previous: Number(avgOpen.toFixed(1)),
      }));
    }
    if (slaRows.filter((row) => row.atRisk).length >= 2) insights.push(this.makeInsight({
      id: 'repair-sla-at-risk', category: 'SLA', severity: 'warning', title: 'پرونده‌های نزدیک نقض SLA',
      message: `${slaRows.filter((row) => row.atRisk).length} پرونده در آستانه نقض SLA هستند.`,
      recommendation: 'این پرونده‌ها را برای اقدام فوری به مسئول عملیات یا تکنسین مربوطه نمایش دهید.',
      evidence: slaRows.filter((row) => row.atRisk).slice(0, 5).map((row) => `${row.caseNumber} · ${row.status}`), metric: 'slaAtRisk', current: slaRows.filter((row) => row.atRisk).length,
    }));
    if (anomalies.length) insights.push(this.makeInsight({
      id: 'repair-volume-anomaly', category: 'ANOMALY', severity: anomalies.some((item) => item.severity === 'critical') ? 'critical' : 'warning',
      title: 'جهش غیرعادی در ورودی تعمیرات', message: `${anomalies.length} روز با حجم ثبت غیرعادی شناسایی شد.`,
      recommendation: 'این روزها را از نظر خرابی گروهی دستگاه، کمپین خدمات، Import یا ثبت تکراری بررسی کنید.',
      evidence: anomalies.map((item) => `${item.date}: ${item.actual} پرونده در برابر baseline ${item.baseline}`),
    }));
    if (!insights.length && cases.length >= 5) insights.push(this.makeInsight({
      id: 'repair-stable', category: 'HEALTH', severity: 'positive', title: 'شاخص بحرانی شناسایی نشد',
      message: 'در Rule Engine این بازه، افزایش معنی‌دار MTTR، backlog قدیمی، افت SLA یا anomaly حجمی مشاهده نشد.',
      evidence: [`${cases.length} پرونده بررسی شد`, `MTTR: ${currentMttr ?? '—'} روز`],
    }));
    const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      range: { from: range.from, to: range.to },
      kpis: {
        total: cases.length,
        totalChangePct: this.percentChange(cases.length, previousCount),
        open,
        completed,
        canceledOrRejected,
        mttrDays: currentMttr,
        leadTimeDays: currentLead,
        timeToStartHours: average(timeToStart),
      },
      trend,
      comparison: { previous: { total: previousCount, mttrDays: previousMttr, leadTimeDays: previousLead } },
      insights,
      anomalies,
      statusDistribution: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
      typeDistribution: [...typeMap.entries()].map(([type, count]) => ({ type, count })),
      aging,
      statusDuration,
      technicians,
      sla: {
        eligible: slaRows.length,
        compliant: slaCompliant,
        breached: slaBreached,
        atRisk: slaRows.filter((row) => row.atRisk).length,
        complianceRate: slaRows.length ? Number(((slaCompliant / slaRows.length) * 100).toFixed(1)) : null,
        averageOverdueHours: average(overdueValues),
        trend: slaTrend,
        byType: slaByType,
        breaches: slaRows.filter((row) => row.breached).sort((a, b) => b.overdueHours - a.overdueHours).slice(0, 25),
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
        sla: true,
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
         ...(this.completedStatuses.includes(newStatus) && !repair.completedAt
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

      const completionStatuses: RepairStatus[] = [RepairStatus.CLOSED, RepairStatus.DELIVERED, RepairStatus.NO_REPAIR_REQUIRED];
      if (completionStatuses.includes(newStatus)) {
        const sla = await tx.repairSla.findUnique({ where: { repairCaseId: repairId } });
        if (sla) {
          const completedAt = updated.completedAt ?? new Date();
          await tx.repairSla.update({
            where: { repairCaseId: repairId },
            data: { completedAt, isBreached: completedAt > sla.dueAt },
          });
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

  async getSlaPolicies() {
    const rows = await this.prisma.repairSlaPolicy.findMany({ orderBy: { type: 'asc' } });
    const map = new Map(rows.map((row) => [row.type, row]));
    return Object.values(RepairType).map((type) => ({
      type,
      targetHours: map.get(type)?.targetHours ?? null,
      isActive: map.get(type)?.isActive ?? false,
    }));
  }

  async updateSlaPolicies(items: Array<{ type: RepairType; targetHours: number; isActive?: boolean }>) {
    for (const item of items) {
      if (!Object.values(RepairType).includes(item.type) || !Number.isFinite(item.targetHours) || item.targetHours < 1) continue;
      await this.prisma.repairSlaPolicy.upsert({
        where: { type: item.type },
        create: { type: item.type, targetHours: Math.round(item.targetHours), isActive: item.isActive ?? true },
        update: { targetHours: Math.round(item.targetHours), isActive: item.isActive ?? true },
      });
    }
    return this.getSlaPolicies();
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
