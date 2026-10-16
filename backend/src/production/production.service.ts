import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormSubmissionsService } from '../form-submissions/form-submissions.service';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import {
  CreateProductionFlowDto,
  ReviewProductionQcDto,
  ReviewProductionStepDto,
  StartProductionRunDto,
  SubmitProductionStepDto,
  UpdateProductionChecklistDto,
  UpdateProductionFlowDto,
} from './dto/production.dto';

const userSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  departmentId: true,
} as const;

type ChecklistItem = {
  id: string;
  title: string;
  required: boolean;
  checked: boolean;
  checkedAt?: string | null;
  checkedById?: string | null;
};

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: FormSubmissionsService,
  ) {}

  private ensureUniqueOrders(steps: { stepOrder: number }[]) {
    const orders = steps.map((s) => s.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('شماره مرحله‌ها باید یکتا باشد');
    }
    const sorted = [...orders].sort((a, b) => a - b);
    sorted.forEach((n, i) => {
      if (n !== i + 1) {
        throw new BadRequestException('ترتیب مراحل باید از 1 و بدون فاصله باشد');
      }
    });
  }

  private async validateReferences(dto: CreateProductionFlowDto | UpdateProductionFlowDto) {
    this.ensureUniqueOrders(dto.steps);
    if (dto.requiresQc && !dto.qcAssigneeId) {
      throw new BadRequestException('برای QC نهایی باید مسئول کنترل کیفیت تعیین شود');
    }
    const formIds = [...new Set(dto.steps.map((s) => s.formId))];
    const userIds = [
      ...new Set(
        [
          ...dto.steps.flatMap((s) => [s.assigneeUserId, s.supervisorUserId, s.approverUserId]),
          dto.qcAssigneeId,
        ].filter(Boolean) as string[],
      ),
    ];
    const [forms, users] = await Promise.all([
      this.prisma.form.findMany({ where: { id: { in: formIds }, isActive: true }, select: { id: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } }),
    ]);
    if (forms.length !== formIds.length) {
      throw new BadRequestException('یک یا چند فرم انتخاب‌شده معتبر نیست');
    }
    if (users.length !== userIds.length) {
      throw new BadRequestException('یک یا چند کاربر انتخاب‌شده معتبر نیست');
    }
  }

  private checklistTemplate(items?: Array<{ title: string; required?: boolean }>) {
    return (items ?? []).map((item) => ({ title: item.title.trim(), required: item.required !== false }));
  }

  async createFlow(dto: CreateProductionFlowDto, user: AuthenticatedUser) {
    await this.validateReferences(dto);
    return this.prisma.productionFlow.create({
      data: {
        name: dto.name,
        code: dto.code?.trim() || null,
        description: dto.description,
        isActive: dto.isActive ?? true,
        requiresQc: dto.requiresQc ?? false,
        qcAssigneeId: dto.requiresQc ? dto.qcAssigneeId : null,
        createdById: user.id,
        steps: {
          create: dto.steps.map((s) => ({
            stepOrder: s.stepOrder,
            name: s.name,
            description: s.description,
            formId: s.formId,
            assigneeUserId: s.assigneeUserId,
            supervisorUserId: s.supervisorUserId || null,
            approverUserId: s.approverUserId || null,
            estimatedMinutes: s.estimatedMinutes,
            checklistTemplate: this.checklistTemplate(s.checklist) as any,
          })),
        },
      },
      include: this.flowInclude(),
    });
  }

  async updateFlow(id: string, dto: UpdateProductionFlowDto) {
    const flow = await this.prisma.productionFlow.findUnique({ where: { id }, include: { runs: { take: 1 } } });
    if (!flow) throw new NotFoundException('خط تولید پیدا نشد');
    if (flow.runs.length) {
      throw new BadRequestException('این Flow قبلاً اجرا شده است؛ برای حفظ تاریخچه یک Flow جدید بسازید یا این Flow را غیرفعال کنید');
    }
    await this.validateReferences(dto);
    return this.prisma.$transaction(async (tx) => {
      await tx.productionFlowStep.deleteMany({ where: { flowId: id } });
      return tx.productionFlow.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code?.trim() || null,
          description: dto.description,
          isActive: dto.isActive ?? true,
          requiresQc: dto.requiresQc ?? false,
          qcAssigneeId: dto.requiresQc ? dto.qcAssigneeId : null,
          steps: {
            create: dto.steps.map((s) => ({
              stepOrder: s.stepOrder,
              name: s.name,
              description: s.description,
              formId: s.formId,
              assigneeUserId: s.assigneeUserId,
              supervisorUserId: s.supervisorUserId || null,
              approverUserId: s.approverUserId || null,
              estimatedMinutes: s.estimatedMinutes,
              checklistTemplate: this.checklistTemplate(s.checklist) as any,
            })),
          },
        },
        include: this.flowInclude(),
      });
    });
  }

  async deleteFlow(id: string) {
    const runs = await this.prisma.productionRun.count({ where: { flowId: id } });
    if (runs) return this.prisma.productionFlow.update({ where: { id }, data: { isActive: false } });
    return this.prisma.productionFlow.delete({ where: { id } });
  }

  async getCatalog() {
    const [forms, users] = await Promise.all([
      this.prisma.form.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, customId: true, description: true, version: true },
      }),
      this.prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, phoneNumber: true, departmentId: true },
      }),
    ]);
    return { forms, users };
  }

  async listFlows() {
    return this.prisma.productionFlow.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { ...this.flowInclude(), _count: { select: { runs: true } } },
    });
  }

  async getFlow(id: string) {
    const flow = await this.prisma.productionFlow.findUnique({
      where: { id },
      include: { ...this.flowInclude(), _count: { select: { runs: true } } },
    });
    if (!flow) throw new NotFoundException('خط تولید پیدا نشد');
    return flow;
  }

  private flowInclude() {
    return {
      createdBy: { select: userSelect },
      qcAssignee: { select: userSelect },
      steps: {
        orderBy: { stepOrder: 'asc' as const },
        include: {
          form: { select: { id: true, name: true, customId: true, description: true, version: true } },
          assignee: { select: userSelect },
          supervisor: { select: userSelect },
          approver: { select: userSelect },
        },
      },
    };
  }

  private async nextReferenceNo() {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const prefix = `PRD-${y}${m}${d}`;
    const count = await this.prisma.productionRun.count({ where: { referenceNo: { startsWith: prefix } } });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  async startRun(flowId: string, dto: StartProductionRunDto, user: AuthenticatedUser) {
    const flow = await this.prisma.productionFlow.findUnique({
      where: { id: flowId, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!flow) throw new NotFoundException('خط تولید فعال پیدا نشد');
    if (!flow.steps.length) throw new BadRequestException('این خط تولید هیچ مرحله‌ای ندارد');
    if (dto.serialNumber) {
      const duplicate = await this.prisma.productionRun.findUnique({ where: { serialNumber: dto.serialNumber } });
      if (duplicate) throw new BadRequestException('این شماره سریال قبلاً در تولید ثبت شده است');
    }
    const referenceNo = await this.nextReferenceNo();
    return this.prisma.productionRun.create({
      data: {
        flowId,
        title: dto.title,
        productName: dto.productName,
        productCode: dto.productCode?.trim() || null,
        serialNumber: dto.serialNumber?.trim() || null,
        batchNumber: dto.batchNumber?.trim() || null,
        quantity: dto.quantity ?? 1,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        referenceNo,
        startedById: user.id,
        currentStepOrder: 1,
        metadata: dto.metadata as any,
        qcStatus: flow.requiresQc ? 'PENDING' : 'NOT_REQUIRED',
        qcAssigneeId: flow.requiresQc ? flow.qcAssigneeId : null,
        steps: {
          create: flow.steps.map((s) => {
            const template = Array.isArray(s.checklistTemplate) ? (s.checklistTemplate as Array<{ title: string; required?: boolean }>) : [];
            const checklist: ChecklistItem[] = template.map((item, index) => ({
              id: `${s.id}:${index + 1}`,
              title: item.title,
              required: item.required !== false,
              checked: false,
              checkedAt: null,
              checkedById: null,
            }));
            return {
              flowStepId: s.id,
              stepOrder: s.stepOrder,
              name: s.name,
              description: s.description,
              formId: s.formId,
              assigneeUserId: s.assigneeUserId,
              supervisorUserId: s.supervisorUserId,
              approverUserId: s.approverUserId,
              checklist: checklist as any,
              status: s.stepOrder === 1 ? 'READY' : 'LOCKED',
            };
          }),
        },
      },
      include: this.runInclude(),
    });
  }

  async listRuns(filters?: { q?: string; status?: string; flowId?: string; qcStatus?: string }) {
    const q = filters?.q?.trim();
    const allowedStatuses = ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    const allowedQc = ['NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED'];
    const where: any = {};
    if (filters?.status && allowedStatuses.includes(filters.status)) where.status = filters.status;
    if (filters?.flowId) where.flowId = filters.flowId;
    if (filters?.qcStatus && allowedQc.includes(filters.qcStatus)) where.qcStatus = filters.qcStatus;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { productName: { contains: q, mode: 'insensitive' } },
        { productCode: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { batchNumber: { contains: q, mode: 'insensitive' } },
        { referenceNo: { contains: q, mode: 'insensitive' } },
        { flow: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.productionRun.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: this.runInclude(),
    });
  }

  async myTasks(userId: string) {
    return this.prisma.productionRunStep.findMany({
      where: {
        OR: [
          { assigneeUserId: userId, status: { in: ['READY', 'IN_PROGRESS', 'NEEDS_REVISION'] } },
          { supervisorUserId: userId, status: 'WAITING_SUPERVISOR' },
          { approverUserId: userId, status: 'WAITING_APPROVAL' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        run: { select: { id: true, title: true, productName: true, serialNumber: true, referenceNo: true, status: true, flow: { select: { id: true, name: true } } } },
        assignee: { select: userSelect },
        supervisor: { select: userSelect },
        approver: { select: userSelect },
        submission: true,
      },
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.productionRun.findUnique({ where: { id }, include: this.runInclude() });
    if (!run) throw new NotFoundException('اجرای تولید پیدا نشد');
    return run;
  }

  private runInclude() {
    return {
      flow: { select: { id: true, name: true, code: true, requiresQc: true } },
      startedBy: { select: userSelect },
      qcAssignee: { select: userSelect },
      qcReviewer: { select: userSelect },
      steps: {
        orderBy: { stepOrder: 'asc' as const },
        include: {
          assignee: { select: userSelect },
          supervisor: { select: userSelect },
          approver: { select: userSelect },
          submission: { include: { user: { select: userSelect } } },
          reviews: { orderBy: { createdAt: 'asc' as const }, include: { reviewer: { select: userSelect } } },
        },
      },
    };
  }

  async beginStep(runId: string, stepId: string, user: AuthenticatedUser) {
    const step = await this.getRunStep(runId, stepId);
    if (step.assigneeUserId !== user.id) throw new ForbiddenException('فقط مسئول این مرحله می‌تواند آن را شروع کند');
    if (!['READY', 'NEEDS_REVISION'].includes(step.status)) throw new BadRequestException('این مرحله آماده شروع نیست');
    return this.prisma.productionRunStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', startedAt: step.startedAt ?? new Date() },
    });
  }

  async updateChecklist(runId: string, stepId: string, dto: UpdateProductionChecklistDto, user: AuthenticatedUser) {
    const step = await this.getRunStep(runId, stepId);
    if (step.assigneeUserId !== user.id) throw new ForbiddenException('فقط مسئول مرحله می‌تواند چک‌لیست را تغییر دهد');
    if (!['READY', 'IN_PROGRESS', 'NEEDS_REVISION'].includes(step.status)) throw new BadRequestException('چک‌لیست این مرحله قابل تغییر نیست');
    const items: ChecklistItem[] = Array.isArray(step.checklist) ? (step.checklist as unknown as ChecklistItem[]) : [];
    const index = items.findIndex((item) => item.id === dto.itemId);
    if (index < 0) throw new NotFoundException('آیتم چک‌لیست پیدا نشد');
    items[index] = {
      ...items[index],
      checked: dto.checked,
      checkedAt: dto.checked ? new Date().toISOString() : null,
      checkedById: dto.checked ? user.id : null,
    };
    await this.prisma.productionRunStep.update({ where: { id: stepId }, data: { checklist: items as any } });
    return this.getRun(runId);
  }

  private ensureChecklistComplete(step: { checklist: unknown }) {
    const items: ChecklistItem[] = Array.isArray(step.checklist) ? (step.checklist as ChecklistItem[]) : [];
    const missing = items.filter((item) => item.required && !item.checked);
    if (missing.length) throw new BadRequestException(`ابتدا چک‌لیست اجباری مرحله را کامل کنید (${missing.length} مورد باقی مانده)`);
  }

  async submitStep(runId: string, stepId: string, dto: SubmitProductionStepDto, user: AuthenticatedUser) {
    const step = await this.getRunStep(runId, stepId);
    if (step.assigneeUserId !== user.id) throw new ForbiddenException('فقط مسئول این مرحله می‌تواند فرم را ثبت کند');
    if (!['READY', 'IN_PROGRESS', 'NEEDS_REVISION'].includes(step.status)) throw new BadRequestException('در وضعیت فعلی امکان ثبت فرم وجود ندارد');
    this.ensureChecklistComplete(step);

    const submission = await this.submissions.create({ formId: step.formId, data: dto.data }, user.id);
    const nextStatus = step.supervisorUserId ? 'WAITING_SUPERVISOR' : step.approverUserId ? 'WAITING_APPROVAL' : 'COMPLETED';
    await this.prisma.productionRunStep.update({
      where: { id: step.id },
      data: {
        submissionId: submission.id,
        status: nextStatus as any,
        submittedAt: new Date(),
        startedAt: step.startedAt ?? new Date(),
        attempt: { increment: 1 },
        completedAt: nextStatus === 'COMPLETED' ? new Date() : null,
      },
    });
    if (nextStatus === 'COMPLETED') await this.advanceRun(runId, step.stepOrder);
    return this.getRun(runId);
  }

  async reviewStep(runId: string, stepId: string, type: 'SUPERVISOR' | 'APPROVER', dto: ReviewProductionStepDto, user: AuthenticatedUser) {
    const step = await this.getRunStep(runId, stepId);
    const isSupervisor = type === 'SUPERVISOR';
    const expectedUser = isSupervisor ? step.supervisorUserId : step.approverUserId;
    const expectedStatus = isSupervisor ? 'WAITING_SUPERVISOR' : 'WAITING_APPROVAL';
    if (expectedUser !== user.id) throw new ForbiddenException('شما تأییدکننده این مرحله نیستید');
    if (step.status !== expectedStatus) throw new BadRequestException('این مرحله در انتظار بررسی شما نیست');

    await this.prisma.productionStepReview.create({
      data: { runStepId: step.id, reviewerId: user.id, type, action: dto.action, comment: dto.comment },
    });
    if (dto.action === 'REJECTED') {
      await this.prisma.productionRunStep.update({
        where: { id: step.id },
        data: { status: 'NEEDS_REVISION', submissionId: null, submittedAt: null, completedAt: null },
      });
      return this.getRun(runId);
    }
    if (isSupervisor && step.approverUserId) {
      await this.prisma.productionRunStep.update({ where: { id: step.id }, data: { status: 'WAITING_APPROVAL' } });
    } else {
      await this.prisma.productionRunStep.update({ where: { id: step.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await this.advanceRun(runId, step.stepOrder);
    }
    return this.getRun(runId);
  }

  async reviewQc(runId: string, dto: ReviewProductionQcDto, user: AuthenticatedUser) {
    const run = await this.prisma.productionRun.findUnique({ where: { id: runId }, include: { steps: { orderBy: { stepOrder: 'desc' }, take: 1 } } });
    if (!run) throw new NotFoundException('اجرای تولید پیدا نشد');
    if (run.qcStatus === 'NOT_REQUIRED') throw new BadRequestException('این محصول نیاز به QC نهایی ندارد');
    if (run.qcStatus !== 'PENDING') throw new BadRequestException('QC این محصول در وضعیت قابل بررسی نیست');
    if (run.qcAssigneeId !== user.id) throw new ForbiddenException('فقط مسئول QC این محصول می‌تواند نتیجه را ثبت کند');
    if (run.currentStepOrder !== null) throw new BadRequestException('ابتدا تمام مراحل تولید باید تکمیل شوند');
    if (run.status === 'CANCELLED') throw new BadRequestException('محصول لغو شده است');

    if (dto.status === 'PASSED') {
      await this.prisma.productionRun.update({
        where: { id: runId },
        data: { qcStatus: 'PASSED', qcReviewerId: user.id, qcNotes: dto.notes, qcReviewedAt: new Date(), status: 'COMPLETED', completedAt: new Date() },
      });
    } else {
      const lastStep = run.steps[0];
      await this.prisma.$transaction([
        this.prisma.productionRun.update({
          where: { id: runId },
          data: { qcStatus: 'FAILED', qcReviewerId: user.id, qcNotes: dto.notes, qcReviewedAt: new Date(), status: 'IN_PROGRESS', completedAt: null, currentStepOrder: lastStep?.stepOrder ?? null },
        }),
        ...(lastStep ? [this.prisma.productionRunStep.update({ where: { id: lastStep.id }, data: { status: 'NEEDS_REVISION', completedAt: null } })] : []),
      ]);
    }
    return this.getRun(runId);
  }

  async setRunStatus(runId: string, action: 'pause' | 'resume' | 'cancel') {
    const run = await this.prisma.productionRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('اجرای تولید پیدا نشد');
    if (action === 'cancel') return this.prisma.productionRun.update({ where: { id: runId }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    if (action === 'pause') return this.prisma.productionRun.update({ where: { id: runId }, data: { status: 'PAUSED' } });
    return this.prisma.productionRun.update({ where: { id: runId }, data: { status: 'IN_PROGRESS' } });
  }

  private async getRunStep(runId: string, stepId: string) {
    const step = await this.prisma.productionRunStep.findFirst({ where: { id: stepId, runId } });
    if (!step) throw new NotFoundException('مرحله تولید پیدا نشد');
    const run = await this.prisma.productionRun.findUnique({ where: { id: runId } });
    if (!run || run.status !== 'IN_PROGRESS') throw new BadRequestException('این اجرای تولید فعال نیست');
    return step;
  }

  private async advanceRun(runId: string, completedOrder: number) {
    const next = await this.prisma.productionRunStep.findFirst({ where: { runId, stepOrder: completedOrder + 1 } });
    if (next) {
      await this.prisma.$transaction([
        this.prisma.productionRunStep.update({ where: { id: next.id }, data: { status: 'READY' } }),
        this.prisma.productionRun.update({ where: { id: runId }, data: { currentStepOrder: next.stepOrder } }),
      ]);
      return;
    }
    const run = await this.prisma.productionRun.findUnique({ where: { id: runId } });
    if (!run) return;
    if (run.qcStatus !== 'NOT_REQUIRED') {
      await this.prisma.productionRun.update({ where: { id: runId }, data: { status: 'IN_PROGRESS', currentStepOrder: null, qcStatus: 'PENDING', completedAt: null } });
      return;
    }
    await this.prisma.productionRun.update({ where: { id: runId }, data: { status: 'COMPLETED', currentStepOrder: null, completedAt: new Date() } });
  }

  private rangeStart(range?: string) {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '180d' ? 180 : 30;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - days + 1);
    return { from, to: new Date(), days };
  }

  async getAnalytics(range?: string, q?: string) {
    const period = this.rangeStart(range);
    const where: any = { startedAt: { gte: period.from, lte: period.to } };
    if (q?.trim()) {
      const term = q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { productName: { contains: term, mode: 'insensitive' } },
        { serialNumber: { contains: term, mode: 'insensitive' } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { flow: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }
    const runs = await this.prisma.productionRun.findMany({
      where,
      include: {
        flow: { select: { id: true, name: true } },
        qcAssignee: { select: userSelect },
        steps: { include: { assignee: { select: userSelect }, reviews: true } },
      },
      orderBy: { startedAt: 'asc' },
    });
    const total = runs.length;
    const completed = runs.filter((r) => r.status === 'COMPLETED').length;
    const active = runs.filter((r) => r.status === 'IN_PROGRESS').length;
    const cancelled = runs.filter((r) => r.status === 'CANCELLED').length;
    const qcEligible = runs.filter((r) => r.qcStatus !== 'NOT_REQUIRED');
    const qcPassed = runs.filter((r) => r.qcStatus === 'PASSED').length;
    const qcFailed = runs.filter((r) => r.qcStatus === 'FAILED').length;
    const durations = runs.filter((r) => r.completedAt).map((r) => (r.completedAt!.getTime() - r.startedAt.getTime()) / 3_600_000);
    const avgCycleHours = durations.length ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)) : null;
    const overdue = runs.filter((r) => r.dueDate && r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.dueDate < period.to).length;

    let checklistTotal = 0;
    let checklistChecked = 0;
    for (const run of runs) for (const step of run.steps) {
      const items = Array.isArray(step.checklist) ? (step.checklist as unknown as ChecklistItem[]) : [];
      checklistTotal += items.length;
      checklistChecked += items.filter((x) => x.checked).length;
    }

    const statusDistribution = ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'].map((status) => ({ status, count: runs.filter((r) => r.status === status).length }));
    const qcDistribution = ['NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED'].map((status) => ({ status, count: runs.filter((r) => r.qcStatus === status).length }));

    const flowMap = new Map<string, { id: string; name: string; total: number; completed: number; failedQc: number; hours: number[] }>();
    const assigneeMap = new Map<string, { id: string; name: string; steps: number; completed: number; revisions: number }>();
    const bottleneckMap = new Map<string, { name: string; samples: number; totalHours: number }>();
    for (const run of runs) {
      const f = flowMap.get(run.flow.id) ?? { id: run.flow.id, name: run.flow.name, total: 0, completed: 0, failedQc: 0, hours: [] };
      f.total++;
      if (run.status === 'COMPLETED') f.completed++;
      if (run.qcStatus === 'FAILED') f.failedQc++;
      if (run.completedAt) f.hours.push((run.completedAt.getTime() - run.startedAt.getTime()) / 3_600_000);
      flowMap.set(run.flow.id, f);
      for (const step of run.steps) {
        const a = assigneeMap.get(step.assignee.id) ?? { id: step.assignee.id, name: step.assignee.name, steps: 0, completed: 0, revisions: 0 };
        a.steps++;
        if (step.status === 'COMPLETED') a.completed++;
        a.revisions += step.reviews.filter((review) => review.action === 'REJECTED').length;
        assigneeMap.set(step.assignee.id, a);
        if (step.startedAt && step.completedAt) {
          const key = step.name;
          const b = bottleneckMap.get(key) ?? { name: key, samples: 0, totalHours: 0 };
          b.samples++;
          b.totalHours += (step.completedAt.getTime() - step.startedAt.getTime()) / 3_600_000;
          bottleneckMap.set(key, b);
        }
      }
    }
    const flows = [...flowMap.values()].map((x) => ({
      id: x.id, name: x.name, total: x.total, completed: x.completed,
      completionRate: x.total ? Number(((x.completed / x.total) * 100).toFixed(1)) : 0,
      qcFailed: x.failedQc,
      avgCycleHours: x.hours.length ? Number((x.hours.reduce((a, b) => a + b, 0) / x.hours.length).toFixed(1)) : null,
    })).sort((a, b) => b.total - a.total);
    const assignees = [...assigneeMap.values()].sort((a, b) => b.steps - a.steps);
    const bottlenecks = [...bottleneckMap.values()].map((x) => ({ name: x.name, samples: x.samples, avgHours: Number((x.totalHours / x.samples).toFixed(1)) })).sort((a, b) => b.avgHours - a.avgHours).slice(0, 10);

    const dayMap = new Map<string, { started: number; completed: number }>();
    for (let i = 0; i < period.days; i++) {
      const d = new Date(period.from); d.setDate(d.getDate() + i);
      dayMap.set(d.toISOString().slice(0, 10), { started: 0, completed: 0 });
    }
    for (const run of runs) {
      const startKey = run.startedAt.toISOString().slice(0, 10);
      if (dayMap.has(startKey)) dayMap.get(startKey)!.started++;
      if (run.completedAt) {
        const key = run.completedAt.toISOString().slice(0, 10);
        if (dayMap.has(key)) dayMap.get(key)!.completed++;
      }
    }
    const trend = [...dayMap.entries()].map(([date, value]) => ({ date, ...value }));

    return {
      range: { from: period.from.toISOString(), to: period.to.toISOString() },
      kpis: {
        total, active, completed, cancelled, overdue,
        completionRate: total ? Number(((completed / total) * 100).toFixed(1)) : null,
        avgCycleHours,
        qcPassRate: qcEligible.length ? Number(((qcPassed / qcEligible.length) * 100).toFixed(1)) : null,
        qcFailed,
        checklistCompletionRate: checklistTotal ? Number(((checklistChecked / checklistTotal) * 100).toFixed(1)) : null,
      },
      trend,
      statusDistribution,
      qcDistribution,
      flows,
      assignees,
      bottlenecks,
      recent: [...runs].reverse().slice(0, 20).map((r) => ({
        id: r.id, referenceNo: r.referenceNo, productName: r.productName, serialNumber: r.serialNumber,
        flow: r.flow.name, status: r.status, qcStatus: r.qcStatus, startedAt: r.startedAt, completedAt: r.completedAt,
      })),
    };
  }
}
