import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormDto, ownerId: string) {
    return this.prisma.form.create({
      data: {
        ownerId,
        customId: dto.customId,
        name: dto.name,
        description: dto.description,
        schema: dto.schema,
        version: 1,
      },
    });
  }

  async findAll(ownerId?: string) {
    return this.prisma.form.findMany({
      where: ownerId ? { ownerId, isActive: true } : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async findManaged(ownerId: string) {
    return this.prisma.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async findById(id: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        stats: true,
        analysis: true,
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
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
    return {
      from,
      to,
      previousFrom: new Date(from.getTime() - duration),
      previousTo: new Date(from.getTime() - 1),
    };
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private buildDailySeries(from: Date, to: Date, dates: Date[]) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = this.dayKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const out: { date: string; count: number }[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      const key = this.dayKey(cursor);
      out.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  private dailySpikeAnomalies(series: { date: string; count: number }[]) {
    if (series.length < 7) return [];
    const values = series.map((item) => item.count);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean < 1) return [];
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    if (std === 0) return [];
    return series
      .map((item) => ({ ...item, zScore: (item.count - mean) / std }))
      .filter((item) => item.zScore >= 2 && item.count >= Math.max(3, mean * 1.5))
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, 5)
      .map((item) => ({
        id: `submission-spike-${item.date}`,
        kind: 'SPIKE',
        severity: item.zScore >= 3 ? 'critical' : 'warning',
        date: item.date,
        metric: 'submissions',
        actual: item.count,
        baseline: Number(mean.toFixed(1)),
        zScore: Number(item.zScore.toFixed(2)),
        message: `تعداد پاسخ‌های ثبت‌شده در ${item.date} به‌طور غیرعادی بالاتر از الگوی بازه بوده است.`,
      }));
  }

  private makeInsight(input: {
    id: string; category: string; severity: 'info' | 'warning' | 'critical' | 'positive';
    title: string; message: string; recommendation?: string; evidence?: string[];
    metric?: string; current?: number | null; previous?: number | null; changePct?: number | null;
  }) { return input; }

  async getAnalyticsOverview(
    ownerId: string,
    input: { range?: string; from?: string; to?: string },
  ) {
    const range = this.resolveAnalyticsRange(input);
    const forms = await this.prisma.form.findMany({
      where: { ownerId },
      select: { id: true, name: true, customId: true },
    });
    const formIds = forms.map((form) => form.id);

    const submissions = formIds.length
      ? await this.prisma.formSubmission.findMany({
          where: { formId: { in: formIds }, createdAt: { gte: range.from, lte: range.to } },
          select: {
            id: true,
            formId: true,
            createdAt: true,
            approvalInstances: { select: { status: true, updatedAt: true } },
          },
        })
      : [];
    const previousCount = formIds.length
      ? await this.prisma.formSubmission.count({
          where: { formId: { in: formIds }, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
        })
      : 0;

    const formMap = new Map(forms.map((form) => [form.id, form]));
    const byForm = new Map<string, { submissions: number; approved: number; rejected: number; pending: number }>();
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    const processingHours: number[] = [];

    for (const submission of submissions) {
      const row = byForm.get(submission.formId) ?? { submissions: 0, approved: 0, rejected: 0, pending: 0 };
      row.submissions += 1;
      const instance = submission.approvalInstances[0];
      if (instance?.status === 'APPROVED') {
        approved += 1;
        row.approved += 1;
        processingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
      } else if (instance?.status === 'REJECTED') {
        rejected += 1;
        row.rejected += 1;
        processingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
      } else if (instance?.status === 'PENDING') {
        pending += 1;
        row.pending += 1;
      }
      byForm.set(submission.formId, row);
    }

    const workflowTotal = approved + rejected + pending;
    const overviewTrend = this.buildDailySeries(range.from, range.to, submissions.map((s) => s.createdAt));
    const anomalies = this.dailySpikeAnomalies(overviewTrend);
    const insights = [] as ReturnType<FormsService['makeInsight']>[];
    if (submissions.length >= 5 && previousCount >= 5) {
      const change = this.percentChange(submissions.length, previousCount);
      if (change != null && Math.abs(change) >= 30) insights.push(this.makeInsight({
        id: 'forms-volume-change', category: 'VOLUME', severity: Math.abs(change) >= 60 ? 'warning' : 'info',
        title: change > 0 ? 'افزایش حجم فرم‌ها' : 'کاهش حجم فرم‌ها',
        message: `تعداد پاسخ‌ها نسبت به بازه قبل ${Math.abs(change)}٪ ${change > 0 ? 'افزایش' : 'کاهش'} داشته است.`,
        evidence: [`بازه جاری: ${submissions.length} پاسخ`, `بازه قبل: ${previousCount} پاسخ`],
        metric: 'submissions', current: submissions.length, previous: previousCount, changePct: change,
      }));
    }
    if (workflowTotal >= 5 && rejected / workflowTotal >= 0.15) insights.push(this.makeInsight({
      id: 'forms-high-rejection', category: 'APPROVAL', severity: rejected / workflowTotal >= 0.3 ? 'critical' : 'warning',
      title: 'نرخ رد قابل توجه است', message: `${Number((rejected / workflowTotal * 100).toFixed(1))}٪ از گردش‌های بررسی‌شده رد شده‌اند.`,
      recommendation: 'فرم‌ها و مراحل دارای بیشترین رد را Drill-down کنید و دلیل ردها را بررسی کنید.',
      evidence: [`${rejected} رد از ${workflowTotal} مورد دارای گردش تأیید`], metric: 'rejectionRate', current: Number((rejected / workflowTotal * 100).toFixed(1)),
    }));
    if (anomalies.length) insights.push(this.makeInsight({
      id: 'forms-volume-anomaly', category: 'ANOMALY', severity: anomalies.some((x) => x.severity === 'critical') ? 'critical' : 'warning',
      title: 'جهش غیرعادی در حجم پاسخ‌ها', message: `${anomalies.length} روز با حجم پاسخ غیرعادی شناسایی شد.`,
      recommendation: 'روزهای علامت‌گذاری‌شده را با رویدادها، کمپین‌ها یا خطاهای ثبت تکراری تطبیق دهید.',
      evidence: anomalies.map((x) => `${x.date}: ${x.actual} پاسخ (میانگین ${x.baseline})`),
    }));
    return {
      range: { from: range.from, to: range.to },
      kpis: {
        submissions: submissions.length,
        submissionsChangePct: this.percentChange(submissions.length, previousCount),
        approved,
        rejected,
        pending,
        approvalRate: workflowTotal ? Number(((approved / workflowTotal) * 100).toFixed(1)) : 0,
        rejectionRate: workflowTotal ? Number(((rejected / workflowTotal) * 100).toFixed(1)) : 0,
        pendingRate: workflowTotal ? Number(((pending / workflowTotal) * 100).toFixed(1)) : 0,
        averageProcessingHours: processingHours.length
          ? Number((processingHours.reduce((a, b) => a + b, 0) / processingHours.length).toFixed(1))
          : null,
      },
      trend: overviewTrend,
      insights,
      anomalies,
      forms: [...byForm.entries()]
        .map(([formId, value]) => ({ ...(formMap.get(formId) ?? {}), ...value }))
        .sort((a, b) => b.submissions - a.submissions),
    };
  }

  async getAnalytics(
    formId: string,
    input: { range?: string; from?: string; to?: string },
  ) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        customId: true,
        description: true,
        schema: true,
        slaHours: true,
        approvalPolicies: {
          select: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              select: {
                id: true,
                stepOrder: true,
                slaHours: true,
                role: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const range = this.resolveAnalyticsRange(input);
    const [submissions, previousSubmissions] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where: { formId, createdAt: { gte: range.from, lte: range.to } },
        orderBy: { createdAt: 'asc' },
        include: {
          approvalInstances: {
            include: {
              actions: {
                orderBy: { createdAt: 'asc' },
                include: {
                  step: {
                    select: {
                      id: true,
                      stepOrder: true,
                      role: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.formSubmission.findMany({
        where: { formId, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
        select: {
          id: true,
          createdAt: true,
          approvalInstances: { select: { status: true, updatedAt: true } },
        },
      }),
    ]);
    const previousCount = previousSubmissions.length;

    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let noWorkflow = 0;
    const processingHours: number[] = [];

    for (const submission of submissions) {
      const instance = submission.approvalInstances[0];
      if (!instance) {
        noWorkflow += 1;
        continue;
      }
      if (instance.status === 'APPROVED') approved += 1;
      if (instance.status === 'REJECTED') rejected += 1;
      if (instance.status === 'PENDING') pending += 1;
      if (instance.status !== 'PENDING') {
        processingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
      }
    }

    const workflowTotal = approved + rejected + pending;
    let previousApproved = 0;
    let previousRejected = 0;
    let previousPending = 0;
    const previousProcessingHours: number[] = [];
    for (const submission of previousSubmissions) {
      const instance = submission.approvalInstances[0];
      if (!instance) continue;
      if (instance.status === 'APPROVED') previousApproved += 1;
      if (instance.status === 'REJECTED') previousRejected += 1;
      if (instance.status === 'PENDING') previousPending += 1;
      if (instance.status !== 'PENDING') previousProcessingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
    }
    const previousWorkflowTotal = previousApproved + previousRejected + previousPending;
    const previousRejectionRate = previousWorkflowTotal ? Number(((previousRejected / previousWorkflowTotal) * 100).toFixed(1)) : null;
    const previousApprovalRate = previousWorkflowTotal ? Number(((previousApproved / previousWorkflowTotal) * 100).toFixed(1)) : null;
    const previousAverageProcessingHours = previousProcessingHours.length
      ? Number((previousProcessingHours.reduce((a, b) => a + b, 0) / previousProcessingHours.length).toFixed(1))
      : null;
    const sortedProcessing = [...processingHours].sort((a, b) => a - b);
    const median = sortedProcessing.length
      ? sortedProcessing.length % 2
        ? sortedProcessing[Math.floor(sortedProcessing.length / 2)]
        : (sortedProcessing[sortedProcessing.length / 2 - 1] + sortedProcessing[sortedProcessing.length / 2]) / 2
      : null;

    // Phase 2: approval funnel + bottleneck analysis.
    const policySteps = form.approvalPolicies[0]?.steps ?? [];
    const approvalFunnel = policySteps.map((step) => {
      let entered = 0;
      let processed = 0;
      let stepApproved = 0;
      let stepRejected = 0;
      let pendingHere = 0;
      const waitHours: number[] = [];

      for (const submission of submissions) {
        const instance = submission.approvalInstances[0];
        if (!instance) continue;
        const actions = instance.actions;
        const action = actions.find((item) => item.step.stepOrder === step.stepOrder);
        const hasLaterAction = actions.some((item) => item.step.stepOrder > step.stepOrder);
        const isPendingHere = instance.status === 'PENDING' && instance.currentStepOrder === step.stepOrder;
        const passedPendingStep = instance.status === 'PENDING' && (instance.currentStepOrder ?? 0) > step.stepOrder;

        if (action || hasLaterAction || isPendingHere || passedPendingStep) entered += 1;
        if (isPendingHere) pendingHere += 1;
        if (action) {
          processed += 1;
          if (action.action === 'APPROVED') stepApproved += 1;
          if (action.action === 'REJECTED') stepRejected += 1;
          const previousAction = actions
            .filter((item) => item.step.stepOrder < step.stepOrder)
            .sort((a, b) => b.step.stepOrder - a.step.stepOrder)[0];
          const startedAt = previousAction?.createdAt ?? instance.createdAt ?? submission.createdAt;
          const duration = (action.createdAt.getTime() - startedAt.getTime()) / 3_600_000;
          if (duration >= 0) waitHours.push(duration);
        }
      }

      const averageWaitHours = waitHours.length
        ? Number((waitHours.reduce((a, b) => a + b, 0) / waitHours.length).toFixed(1))
        : null;
      return {
        stepId: step.id,
        stepOrder: step.stepOrder,
        roleId: step.role.id,
        roleName: step.role.name,
        entered,
        processed,
        approved: stepApproved,
        rejected: stepRejected,
        pending: pendingHere,
        conversionRate: entered ? Number(((stepApproved / entered) * 100).toFixed(1)) : 0,
        averageWaitHours,
      };
    });

    const bottleneck = approvalFunnel
      .filter((step) => step.averageWaitHours != null)
      .sort((a, b) => (b.averageWaitHours ?? 0) - (a.averageWaitHours ?? 0))[0] ?? null;

    // Phase 2: dynamic field analytics from the form schema and raw submissions.
    const rawSchema = form.schema as any;
    const fields: any[] = Array.isArray(rawSchema?.sections)
      ? rawSchema.sections.flatMap((section: any) => Array.isArray(section?.fields) ? section.fields : [])
      : Array.isArray(rawSchema?.fields)
        ? rawSchema.fields
        : [];

    const percentileMedian = (values: number[]) => {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const isFilled = (value: unknown) => value !== undefined && value !== null && value !== '';

    const fieldAnalytics = fields.map((field: any) => {
      const key = field.key ?? field.id;
      const values = submissions.map((submission) => (submission.data as any)?.[key]);
      const filledValues = values.filter(isFilled);
      const base: any = {
        key,
        label: field.label ?? key,
        type: field.type ?? 'text',
        required: Boolean(field.required),
        filled: filledValues.length,
        missing: submissions.length - filledValues.length,
        fillRate: submissions.length ? Number(((filledValues.length / submissions.length) * 100).toFixed(1)) : 0,
      };

      if (field.type === 'number' || field.type === 'rating') {
        const numbers = filledValues.map(Number).filter((value) => Number.isFinite(value));
        base.numeric = numbers.length ? {
          count: numbers.length,
          average: Number((numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2)),
          median: Number((percentileMedian(numbers) ?? 0).toFixed(2)),
          min: Math.min(...numbers),
          max: Math.max(...numbers),
        } : null;
      }

      if (['select', 'radio', 'checkbox', 'rating'].includes(field.type)) {
        const counts = new Map<string, number>();
        for (const value of filledValues) {
          const items = Array.isArray(value) ? value : [value];
          for (const item of items) {
            const normalized = typeof item === 'boolean' ? (item ? 'true' : 'false') : String(item);
            counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
          }
        }
        base.distribution = [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);
      }

      if (field.type === 'date') {
        const buckets = new Map<string, number>();
        for (const value of filledValues) {
          const parsed = new Date(String(value));
          if (!Number.isNaN(parsed.getTime())) {
            const bucket = parsed.toISOString().slice(0, 7);
            buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
          }
        }
        base.dateDistribution = [...buckets.entries()]
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month));
      }

      if (['text', 'textarea', 'email', 'tel'].includes(field.type)) {
        const lengths = filledValues.map((value) => String(value).trim().length);
        base.text = {
          averageLength: lengths.length ? Number((lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)) : 0,
        };
      }
      return base;
    });

    // Phase 3: overall form SLA + per approval-step SLA.
    const slaTarget = form.slaHours ?? null;
    const slaRows = submissions.flatMap((submission) => {
      if (!slaTarget) return [];
      const instance = submission.approvalInstances[0];
      if (!instance) return [];
      const finishedAt = instance.status === 'PENDING' ? range.to : instance.updatedAt;
      const dueAt = new Date(submission.createdAt.getTime() + slaTarget * 3_600_000);
      const overdueHours = Math.max(0, (finishedAt.getTime() - dueAt.getTime()) / 3_600_000);
      return [{ submissionId: submission.id, status: instance.status, targetHours: slaTarget, dueAt, finishedAt: instance.status === 'PENDING' ? null : instance.updatedAt, overdueHours: Number(overdueHours.toFixed(1)), breached: overdueHours > 0 }];
    });
    const slaBreached = slaRows.filter((x) => x.breached).length;
    const slaCompliant = slaRows.length - slaBreached;
    const slaTrendMap = new Map<string, { compliant: number; breached: number }>();
    for (const row of slaRows) {
      const submission = submissions.find((x) => x.id === row.submissionId)!;
      const key = this.dayKey(submission.createdAt); const bucket = slaTrendMap.get(key) ?? { compliant: 0, breached: 0 };
      row.breached ? bucket.breached++ : bucket.compliant++; slaTrendMap.set(key, bucket);
    }
    const slaTrend = this.buildDailySeries(range.from, range.to, []).map((x) => ({ date: x.date, ...(slaTrendMap.get(x.date) ?? { compliant: 0, breached: 0 }) }));
    const stepSla = approvalFunnel.map((step) => {
      const config = policySteps.find((x) => x.id === step.stepId); const targetHours = config?.slaHours ?? null;
      if (!targetHours) return { stepId: step.stepId, stepOrder: step.stepOrder, roleName: step.roleName, targetHours: null, evaluated: 0, compliant: 0, breached: 0, complianceRate: null, averageOverdueHours: null };
      const waits: number[] = [];
      for (const submission of submissions) {
        const instance = submission.approvalInstances[0]; if (!instance) continue;
        const action = instance.actions.find((a) => a.step.id === step.stepId);
        const prev = instance.actions.filter((a) => a.step.stepOrder < step.stepOrder).sort((a,b)=>b.step.stepOrder-a.step.stepOrder)[0];
        const entered = Boolean(action) || (instance.status === 'PENDING' && instance.currentStepOrder === step.stepOrder); if (!entered) continue;
        const start = prev?.createdAt ?? instance.createdAt ?? submission.createdAt; const end = action?.createdAt ?? range.to;
        waits.push((end.getTime()-start.getTime())/3_600_000);
      }
      const breachedWaits = waits.filter((h) => h > targetHours);
      return { stepId: step.stepId, stepOrder: step.stepOrder, roleName: step.roleName, targetHours, evaluated: waits.length, compliant: waits.length-breachedWaits.length, breached: breachedWaits.length, complianceRate: waits.length ? Number((((waits.length-breachedWaits.length)/waits.length)*100).toFixed(1)) : null, averageOverdueHours: breachedWaits.length ? Number((breachedWaits.reduce((a,b)=>a+(b-targetHours),0)/breachedWaits.length).toFixed(1)) : null };
    });

    // Phase 4: deterministic insight + anomaly engine (no LLM).
    const currentRejectionRate = workflowTotal ? Number(((rejected / workflowTotal) * 100).toFixed(1)) : 0;
    const currentApprovalRate = workflowTotal ? Number(((approved / workflowTotal) * 100).toFixed(1)) : 0;
    const currentAverageProcessingHours = processingHours.length
      ? Number((processingHours.reduce((a, b) => a + b, 0) / processingHours.length).toFixed(1))
      : null;
    const currentTrend = this.buildDailySeries(range.from, range.to, submissions.map((item) => item.createdAt));
    const anomalies = this.dailySpikeAnomalies(currentTrend);
    const insights = [] as ReturnType<FormsService['makeInsight']>[];

    if (submissions.length >= 5 && previousCount >= 5) {
      const volumeChange = this.percentChange(submissions.length, previousCount);
      if (volumeChange != null && Math.abs(volumeChange) >= 30) insights.push(this.makeInsight({
        id: 'form-volume-change', category: 'VOLUME', severity: Math.abs(volumeChange) >= 60 ? 'warning' : 'info',
        title: volumeChange > 0 ? 'افزایش محسوس حجم پاسخ‌ها' : 'کاهش محسوس حجم پاسخ‌ها',
        message: `حجم پاسخ این فرم نسبت به بازه قبل ${Math.abs(volumeChange)}٪ ${volumeChange > 0 ? 'افزایش' : 'کاهش'} داشته است.`,
        evidence: [`بازه جاری: ${submissions.length}`, `بازه قبل: ${previousCount}`], metric: 'submissions', current: submissions.length, previous: previousCount, changePct: volumeChange,
      }));
    }
    if (workflowTotal >= 5 && currentRejectionRate >= 15) insights.push(this.makeInsight({
      id: 'form-rejection-high', category: 'APPROVAL', severity: currentRejectionRate >= 30 ? 'critical' : 'warning',
      title: 'نرخ رد فرم بالاست', message: `${currentRejectionRate}٪ از پاسخ‌های دارای گردش تأیید رد شده‌اند.`,
      recommendation: 'مراحل و علت‌های رد را بررسی کنید؛ اگر ردها روی یک مرحله متمرکز هستند، قوانین یا ورودی‌های آن مرحله را بازبینی کنید.',
      evidence: [`${rejected} رد از ${workflowTotal} گردش`], metric: 'rejectionRate', current: currentRejectionRate, previous: previousRejectionRate,
      changePct: previousRejectionRate == null ? null : Number((currentRejectionRate - previousRejectionRate).toFixed(1)),
    }));
    if (previousRejectionRate != null && workflowTotal >= 5 && previousWorkflowTotal >= 5 && currentRejectionRate - previousRejectionRate >= 8) insights.push(this.makeInsight({
      id: 'form-rejection-rise', category: 'TREND', severity: currentRejectionRate - previousRejectionRate >= 15 ? 'critical' : 'warning',
      title: 'افزایش نرخ رد نسبت به بازه قبل', message: `نرخ رد ${Number((currentRejectionRate - previousRejectionRate).toFixed(1))} واحد درصد افزایش یافته است.`,
      recommendation: 'Submissionهای ردشده در بازه جاری را با بازه قبل مقایسه و مرحله‌ای که تغییر کرده است مشخص کنید.',
      evidence: [`جاری: ${currentRejectionRate}٪`, `قبل: ${previousRejectionRate}٪`], metric: 'rejectionRate', current: currentRejectionRate, previous: previousRejectionRate,
    }));
    if (workflowTotal >= 5 && pending / workflowTotal >= 0.2) insights.push(this.makeInsight({
      id: 'form-pending-backlog', category: 'BOTTLENECK', severity: pending / workflowTotal >= 0.4 ? 'critical' : 'warning',
      title: 'انباشت پاسخ‌های در انتظار', message: `${Number((pending / workflowTotal * 100).toFixed(1))}٪ از گردش‌ها هنوز Pending هستند.`,
      recommendation: 'مراحل دارای بیشترین Pending و زمان انتظار را بررسی و مسئولیت/ظرفیت تأیید را بازتنظیم کنید.',
      evidence: [`${pending} مورد در انتظار از ${workflowTotal} گردش`], metric: 'pendingRate', current: Number((pending / workflowTotal * 100).toFixed(1)),
    }));
    if (currentAverageProcessingHours != null && previousAverageProcessingHours != null && processingHours.length >= 3 && previousProcessingHours.length >= 3) {
      const processingChange = this.percentChange(currentAverageProcessingHours, previousAverageProcessingHours);
      if (processingChange != null && processingChange >= 30) insights.push(this.makeInsight({
        id: 'form-processing-slower', category: 'PERFORMANCE', severity: processingChange >= 70 ? 'critical' : 'warning',
        title: 'کندتر شدن فرآیند تأیید', message: `میانگین زمان تصمیم‌گیری ${processingChange}٪ نسبت به بازه قبل افزایش یافته است.`,
        recommendation: 'Bottleneck مرحله‌ای را بررسی کنید و روی مرحله دارای بیشترین زمان انتظار تمرکز کنید.',
        evidence: [`جاری: ${currentAverageProcessingHours} ساعت`, `قبل: ${previousAverageProcessingHours} ساعت`], metric: 'averageProcessingHours', current: currentAverageProcessingHours, previous: previousAverageProcessingHours, changePct: processingChange,
      }));
    }
    if (bottleneck && bottleneck.averageWaitHours != null && bottleneck.averageWaitHours >= 4 && bottleneck.entered >= 3) insights.push(this.makeInsight({
      id: `form-bottleneck-${bottleneck.stepId}`, category: 'BOTTLENECK', severity: bottleneck.averageWaitHours >= 24 ? 'critical' : 'warning',
      title: `گلوگاه در مرحله ${bottleneck.stepOrder}`, message: `مرحله «${bottleneck.roleName}» با میانگین ${bottleneck.averageWaitHours} ساعت بیشترین زمان انتظار را دارد.`,
      recommendation: 'ظرفیت تأیید، جانشین Approver یا ساده‌سازی شرط این مرحله را بررسی کنید.',
      evidence: [`${bottleneck.entered} ورودی`, `${bottleneck.pending} مورد در انتظار`, `میانگین انتظار ${bottleneck.averageWaitHours} ساعت`], metric: 'approvalStepWaitHours', current: bottleneck.averageWaitHours,
    }));
    const weakFields = fieldAnalytics.filter((field: any) => submissions.length >= 5 && field.fillRate < 70).sort((a: any, b: any) => a.fillRate - b.fillRate).slice(0, 3);
    if (weakFields.length) insights.push(this.makeInsight({
      id: 'form-low-fill-fields', category: 'DATA_QUALITY', severity: weakFields.some((field: any) => field.required) ? 'warning' : 'info',
      title: 'فیلدهای کم‌تکمیل شناسایی شدند', message: `${weakFields.length} فیلد نرخ تکمیل کمتر از ۷۰٪ دارند.`,
      recommendation: 'ضرورت، متن راهنما و محل این فیلدها را بازبینی کنید؛ برای فیلدهای ضروری Validation را بررسی کنید.',
      evidence: weakFields.map((field: any) => `${field.label}: ${field.fillRate}٪`), metric: 'fieldFillRate',
    }));
    if (slaRows.length >= 5 && slaRows.length > 0 && (slaCompliant / slaRows.length) < 0.9) insights.push(this.makeInsight({
      id: 'form-sla-low', category: 'SLA', severity: (slaCompliant / slaRows.length) < 0.7 ? 'critical' : 'warning',
      title: 'رعایت SLA پایین‌تر از هدف عملیاتی است', message: `فقط ${Number(((slaCompliant / slaRows.length) * 100).toFixed(1))}٪ از موارد ارزیابی‌شده داخل SLA بوده‌اند.`,
      recommendation: 'ابتدا Step SLAهای دارای بیشترین Breach را بررسی و سپس SLA کلی فرم را با ظرفیت واقعی تطبیق دهید.',
      evidence: [`${slaBreached} نقض از ${slaRows.length} مورد`], metric: 'slaCompliance', current: Number(((slaCompliant / slaRows.length) * 100).toFixed(1)),
    }));
    if (anomalies.length) insights.push(this.makeInsight({
      id: 'form-submission-anomaly', category: 'ANOMALY', severity: anomalies.some((x) => x.severity === 'critical') ? 'critical' : 'warning',
      title: 'جهش غیرعادی در ثبت پاسخ', message: `${anomalies.length} نقطه غیرعادی در روند ثبت پاسخ شناسایی شد.`,
      recommendation: 'ثبت‌های روز موردنظر را از نظر رویداد واقعی، Import یا ثبت تکراری بررسی کنید.',
      evidence: anomalies.map((x) => `${x.date}: ${x.actual} پاسخ در برابر baseline ${x.baseline}`),
    }));
    if (!insights.length && submissions.length >= 5) insights.push(this.makeInsight({
      id: 'form-stable', category: 'HEALTH', severity: 'positive', title: 'شاخص بحرانی شناسایی نشد',
      message: 'در Rule Engine این بازه، افزایش معنی‌دار رد، backlog، افت SLA یا anomaly حجمی مشاهده نشد.',
      evidence: [`نرخ تأیید ${currentApprovalRate}٪`, `${submissions.length} پاسخ بررسی شد`],
    }));
    const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const { approvalPolicies: _approvalPolicies, ...publicForm } = form;
    return {
      form: publicForm,
      range: { from: range.from, to: range.to },
      kpis: {
        submissions: submissions.length,
        submissionsChangePct: this.percentChange(submissions.length, previousCount),
        approved,
        rejected,
        pending,
        noWorkflow,
        approvalRate: workflowTotal ? Number(((approved / workflowTotal) * 100).toFixed(1)) : 0,
        rejectionRate: workflowTotal ? Number(((rejected / workflowTotal) * 100).toFixed(1)) : 0,
        pendingRate: workflowTotal ? Number(((pending / workflowTotal) * 100).toFixed(1)) : 0,
        averageProcessingHours: processingHours.length
          ? Number((processingHours.reduce((a, b) => a + b, 0) / processingHours.length).toFixed(1))
          : null,
        medianProcessingHours: median == null ? null : Number(median.toFixed(1)),
      },
      trend: currentTrend,
      comparison: {
        previous: {
          submissions: previousCount,
          approvalRate: previousApprovalRate,
          rejectionRate: previousRejectionRate,
          averageProcessingHours: previousAverageProcessingHours,
        },
      },
      insights,
      anomalies,
      statusDistribution: [
        { status: 'APPROVED', count: approved },
        { status: 'REJECTED', count: rejected },
        { status: 'PENDING', count: pending },
        { status: 'NO_WORKFLOW', count: noWorkflow },
      ],
      approvalFunnel,
      bottleneck,
      fieldAnalytics,
      sla: { targetHours: slaTarget, eligible: slaRows.length, compliant: slaCompliant, breached: slaBreached, complianceRate: slaRows.length ? Number(((slaCompliant / slaRows.length) * 100).toFixed(1)) : null, averageOverdueHours: slaBreached ? Number((slaRows.filter(x=>x.breached).reduce((a,b)=>a+b.overdueHours,0)/slaBreached).toFixed(1)) : null, trend: slaTrend, steps: stepSla, breaches: slaRows.filter(x=>x.breached).sort((a,b)=>b.overdueHours-a.overdueHours).slice(0,25) },
    };
  }

  async updateSla(formId: string, ownerId: string, body: { slaHours?: number | null; steps?: Array<{ stepId: string; slaHours: number | null }> }) {
    const form = await this.prisma.form.findUnique({ where: { id: formId }, select: { ownerId: true } });
    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== ownerId) throw new ForbiddenException();
    await this.prisma.form.update({ where: { id: formId }, data: { slaHours: body.slaHours == null ? null : Math.max(1, Math.round(body.slaHours)) } });
    for (const step of body.steps ?? []) {
      await this.prisma.approvalStep.updateMany({ where: { id: step.stepId, policy: { formId } }, data: { slaHours: step.slaHours == null ? null : Math.max(1, Math.round(step.slaHours)) } });
    }
    return this.prisma.form.findUnique({ where: { id: formId }, select: { id: true, slaHours: true, approvalPolicies: { select: { steps: { orderBy: { stepOrder: 'asc' }, select: { id: true, stepOrder: true, slaHours: true, role: { select: { name: true } } } } } } } });
  }

  async getStats(formId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    const [stats, analysis, submissionCount] = await Promise.all([
      this.prisma.formStat.findMany({ where: { formId } }),
      this.prisma.formAnalysis.findMany({
        where: { formId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.formSubmission.count({ where: { formId } }),
    ]);

    return { formId, submissionCount, stats, analysis };
  }

  /**
   * GET /forms/:id/deep-analysis
   *
   * Single round-trip that returns everything the frontend needs:
   *   - Form metadata + schema
   *   - All raw submissions with user info
   *   - All analytics results from the worker, keyed by metric name:
   *       riskAssessment, anomalyDetection, formCategory,
   *       domainClassification, domainInsights,
   *       completionHealth, trendAnalysis, predictions,
   *       submissionHistory
   *   - Per-field rolling stats  (statsByField[fieldId])
   *   - Per-field NLP corpus     (nlpByField[fieldId])
   */
  async getDeepAnalysis(formId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: {
        stats: true,
        analysis: true,
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const submissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    // ── Analytics lookup maps ──────────────────────────────────

    // Form-level metrics (fieldId IS NULL)
    const formLevelMetrics: Record<string, unknown> = {};
    // Per-field rolling stats
    const statsByField: Record<string, unknown> = {};
    // Per-field NLP corpus
    const nlpByField: Record<string, unknown> = {};

    for (const row of form.analysis) {
      if (!row.fieldId) {
        formLevelMetrics[row.metric] = row.value;
      } else if (row.metric === 'nlp_corpus') {
        nlpByField[row.fieldId] = row.value;
      }
    }

    for (const row of form.stats) {
      if (row.metric === 'rolling_stats') {
        statsByField[row.fieldId] = row.value;
      }
    }

    return {
      form: {
        id: form.id,
        customId: form.customId,
        name: form.name,
        description: form.description,
        schema: form.schema,
        version: form.version,
        isActive: form.isActive,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
      submissionCount: form._count.submissions,
      submissions,
      analytics: {
        riskAssessment: formLevelMetrics['risk_assessment'] ?? null,
        anomalyDetection: formLevelMetrics['anomaly_detection'] ?? null,
        formCategory: formLevelMetrics['form_category'] ?? null,
        domainClassification: formLevelMetrics['domain_classification'] ?? null,
        domainInsights: formLevelMetrics['domain_insights'] ?? null,
        completionHealth: formLevelMetrics['completion_health'] ?? null,
        trendAnalysis: formLevelMetrics['trend_analysis'] ?? null,
        predictions: formLevelMetrics['predictions'] ?? null,
        submissionHistory: formLevelMetrics['submission_history'] ?? null,
      },
      statsByField,
      nlpByField,
    };
  }

  async update(id: string, dto: UpdateFormDto, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== ownerId) throw new ForbiddenException();

    return this.prisma.form.update({
      where: { id },
      data: { ...dto, version: dto.schema ? form.version + 1 : form.version },
    });
  }

  async remove(id: string, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== ownerId) throw new ForbiddenException();

    await this.prisma.form.update({ where: { id }, data: { isActive: false } });
    return { message: 'Form deactivated' };
  }
}
