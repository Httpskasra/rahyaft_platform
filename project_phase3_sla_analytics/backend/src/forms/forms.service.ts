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

  async getAnalyticsOverview(
    ownerId: string,
    input: { range?: string; from?: string; to?: string },
  ) {
    const range = this.resolveAnalyticsRange(input);
    const forms = await this.prisma.form.findMany({
      where: { ownerId },
      select: {
        id: true, name: true, customId: true,
        approvalPolicies: { select: { overallSlaHours: true } },
      },
    });
    const formIds = forms.map((form) => form.id);

    const submissions = formIds.length
      ? await this.prisma.formSubmission.findMany({
          where: { formId: { in: formIds }, createdAt: { gte: range.from, lte: range.to } },
          select: {
            id: true,
            formId: true,
            createdAt: true,
            approvalInstances: { select: { status: true, createdAt: true, updatedAt: true, overallSlaHours: true, overallDueAt: true } },
          },
        })
      : [];
    const previousCount = formIds.length
      ? await this.prisma.formSubmission.count({
          where: { formId: { in: formIds }, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
        })
      : 0;

    const formMap = new Map(forms.map((form) => [form.id, form]));
    const byForm = new Map<string, { submissions: number; approved: number; rejected: number; pending: number; slaAssessed: number; slaWithin: number; slaBreached: number }>();
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let slaAssessed = 0;
    let slaWithin = 0;
    let slaBreached = 0;
    const processingHours: number[] = [];

    for (const submission of submissions) {
      const row = byForm.get(submission.formId) ?? { submissions: 0, approved: 0, rejected: 0, pending: 0, slaAssessed: 0, slaWithin: 0, slaBreached: 0 };
      row.submissions += 1;
      const instance = submission.approvalInstances[0];
      if (instance?.status === 'APPROVED') {
        approved += 1; row.approved += 1;
        processingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
      } else if (instance?.status === 'REJECTED') {
        rejected += 1; row.rejected += 1;
        processingHours.push((instance.updatedAt.getTime() - submission.createdAt.getTime()) / 3_600_000);
      } else if (instance?.status === 'PENDING') {
        pending += 1; row.pending += 1;
      }

      const targetHours = instance?.overallSlaHours ?? formMap.get(submission.formId)?.approvalPolicies[0]?.overallSlaHours ?? null;
      if (instance && targetHours) {
        const dueAt = instance.overallDueAt ?? new Date(instance.createdAt.getTime() + targetHours * 3_600_000);
        const endAt = instance.status === 'PENDING' ? range.to : instance.updatedAt;
        const breached = endAt > dueAt;
        slaAssessed += 1; row.slaAssessed += 1;
        if (breached) { slaBreached += 1; row.slaBreached += 1; }
        else { slaWithin += 1; row.slaWithin += 1; }
      }
      byForm.set(submission.formId, row);
    }

    const workflowTotal = approved + rejected + pending;
    return {
      range: { from: range.from, to: range.to },
      kpis: {
        submissions: submissions.length,
        submissionsChangePct: this.percentChange(submissions.length, previousCount),
        approved, rejected, pending,
        approvalRate: workflowTotal ? Number(((approved / workflowTotal) * 100).toFixed(1)) : 0,
        rejectionRate: workflowTotal ? Number(((rejected / workflowTotal) * 100).toFixed(1)) : 0,
        pendingRate: workflowTotal ? Number(((pending / workflowTotal) * 100).toFixed(1)) : 0,
        averageProcessingHours: processingHours.length
          ? Number((processingHours.reduce((a, b) => a + b, 0) / processingHours.length).toFixed(1))
          : null,
      },
      sla: {
        assessed: slaAssessed, within: slaWithin, breached: slaBreached,
        complianceRate: slaAssessed ? Number(((slaWithin / slaAssessed) * 100).toFixed(1)) : null,
      },
      trend: this.buildDailySeries(range.from, range.to, submissions.map((s) => s.createdAt)),
      forms: forms.map((form) => {
        const value = byForm.get(form.id) ?? { submissions: 0, approved: 0, rejected: 0, pending: 0, slaAssessed: 0, slaWithin: 0, slaBreached: 0 };
        const { approvalPolicies: _approvalPolicies, ...base } = form;
        return {
          ...base, ...value,
          slaTargetHours: form.approvalPolicies[0]?.overallSlaHours ?? null,
          slaComplianceRate: value.slaAssessed ? Number(((value.slaWithin / value.slaAssessed) * 100).toFixed(1)) : null,
        };
      }).sort((a, b) => b.submissions - a.submissions),
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
        approvalPolicies: {
          select: {
            overallSlaHours: true,
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
    const [submissions, previousCount] = await Promise.all([
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
                      slaHours: true,
                      role: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.formSubmission.count({
        where: { formId, createdAt: { gte: range.previousFrom, lte: range.previousTo } },
      }),
    ]);

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

    // Phase 3: overall workflow SLA and per-step SLA. Pending items are evaluated as of the selected range end.
    const policy = form.approvalPolicies[0];
    const overallSlaHours = policy?.overallSlaHours ?? null;
    const overallRows = submissions.flatMap((submission) => {
      const instance = submission.approvalInstances[0];
      if (!instance) return [];
      const targetHours = instance.overallSlaHours ?? overallSlaHours;
      if (!targetHours) return [];
      const dueAt = instance.overallDueAt ?? new Date(instance.createdAt.getTime() + targetHours * 3_600_000);
      const resolvedAt = instance.status === 'PENDING' ? null : instance.updatedAt;
      const endAt = resolvedAt ?? range.to;
      const breached = endAt > dueAt;
      return [{ breached, overdueHours: breached ? (endAt.getTime() - dueAt.getTime()) / 3_600_000 : 0 }];
    });
    const overallBreached = overallRows.filter((row) => row.breached).length;
    const overallTrendBuckets = new Map<string, { assessed: number; breached: number }>();
    for (const submission of submissions) {
      const instance = submission.approvalInstances[0];
      if (!instance) continue;
      const targetHours = instance.overallSlaHours ?? overallSlaHours;
      if (!targetHours) continue;
      const dueAt = instance.overallDueAt ?? new Date(instance.createdAt.getTime() + targetHours * 3_600_000);
      const endAt = instance.status === 'PENDING' ? range.to : instance.updatedAt;
      const key = this.dayKey(submission.createdAt);
      const item = overallTrendBuckets.get(key) ?? { assessed: 0, breached: 0 };
      item.assessed += 1;
      if (endAt > dueAt) item.breached += 1;
      overallTrendBuckets.set(key, item);
    }
    const slaTrend = this.buildDailySeries(range.from, range.to, []).map((point) => {
      const item = overallTrendBuckets.get(point.date) ?? { assessed: 0, breached: 0 };
      return { date: point.date, assessed: item.assessed, breached: item.breached, complianceRate: item.assessed ? Number((((item.assessed - item.breached) / item.assessed) * 100).toFixed(1)) : null };
    });

    const stepSla = policySteps.map((step) => {
      const rows: { breached: boolean; overdueHours: number; targetHours: number }[] = [];
      for (const submission of submissions) {
        const instance = submission.approvalInstances[0];
        if (!instance) continue;
        const actions = instance.actions;
        const snapshot = instance.stepSlaConfig && typeof instance.stepSlaConfig === 'object' && !Array.isArray(instance.stepSlaConfig)
          ? Number((instance.stepSlaConfig as Record<string, unknown>)[String(step.stepOrder)])
          : NaN;
        const targetHours = Number.isFinite(snapshot) && snapshot > 0 ? snapshot : step.slaHours;
        if (!targetHours) continue;
        const action = actions.find((item) => item.step.stepOrder === step.stepOrder);
        const hasReached = Boolean(action) || (instance.currentStepOrder ?? 0) >= step.stepOrder || actions.some((item) => item.step.stepOrder > step.stepOrder);
        if (!hasReached) continue;
        const previousAction = actions.filter((item) => item.step.stepOrder < step.stepOrder).sort((a, b) => b.step.stepOrder - a.step.stepOrder)[0];
        const startedAt = previousAction?.createdAt ?? instance.createdAt;
        const endAt = action?.createdAt ?? (instance.status === 'PENDING' && instance.currentStepOrder === step.stepOrder ? range.to : null);
        if (!endAt) continue;
        const dueAt = new Date(startedAt.getTime() + targetHours * 3_600_000);
        const breached = endAt > dueAt;
        rows.push({ breached, overdueHours: breached ? (endAt.getTime() - dueAt.getTime()) / 3_600_000 : 0, targetHours });
      }
      const breached = rows.filter((row) => row.breached).length;
      const within = rows.length - breached;
      const overdue = rows.filter((row) => row.breached).map((row) => row.overdueHours);
      const configuredTarget = step.slaHours ?? (rows[0]?.targetHours ?? null);
      return {
        stepId: step.id, stepOrder: step.stepOrder, roleName: step.role.name, targetHours: configuredTarget, assessed: rows.length, within, breached,
        complianceRate: rows.length ? Number(((within / rows.length) * 100).toFixed(1)) : null,
        averageOverdueHours: overdue.length ? Number((overdue.reduce((a,b) => a+b,0) / overdue.length).toFixed(1)) : null,
      };
    });

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
      trend: this.buildDailySeries(range.from, range.to, submissions.map((s) => s.createdAt)),
      statusDistribution: [
        { status: 'APPROVED', count: approved },
        { status: 'REJECTED', count: rejected },
        { status: 'PENDING', count: pending },
        { status: 'NO_WORKFLOW', count: noWorkflow },
      ],
      approvalFunnel,
      bottleneck,
      sla: {
        configured: Boolean(overallSlaHours || overallRows.length || policySteps.some((step) => step.slaHours) || stepSla.some((step) => step.assessed > 0)),
        overallTargetHours: overallSlaHours,
        assessed: overallRows.length,
        within: overallRows.length - overallBreached,
        breached: overallBreached,
        complianceRate: overallRows.length ? Number((((overallRows.length - overallBreached) / overallRows.length) * 100).toFixed(1)) : null,
        averageOverdueHours: overallRows.some((row) => row.breached)
          ? Number((overallRows.filter((row) => row.breached).reduce((sum, row) => sum + row.overdueHours, 0) / overallBreached).toFixed(1))
          : null,
        trend: slaTrend,
        steps: stepSla,
      },
      fieldAnalytics,
    };
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
