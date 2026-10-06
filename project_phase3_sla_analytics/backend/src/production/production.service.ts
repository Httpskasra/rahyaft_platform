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
  ReviewProductionStepDto,
  StartProductionRunDto,
  SubmitProductionStepDto,
  UpdateProductionFlowDto,
} from './dto/production.dto';

const userSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  departmentId: true,
} as const;

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
      if (n !== i + 1)
        throw new BadRequestException(
          'ترتیب مراحل باید از 1 و بدون فاصله باشد',
        );
    });
  }

  private async validateReferences(
    dto: CreateProductionFlowDto | UpdateProductionFlowDto,
  ) {
    this.ensureUniqueOrders(dto.steps);
    const formIds = [...new Set(dto.steps.map((s) => s.formId))];
    const userIds = [
      ...new Set(
        dto.steps
          .flatMap((s) => [
            s.assigneeUserId,
            s.supervisorUserId,
            s.approverUserId,
          ])
          .filter(Boolean) as string[],
      ),
    ];
    const [forms, users] = await Promise.all([
      this.prisma.form.findMany({
        where: { id: { in: formIds }, isActive: true },
        select: { id: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      }),
    ]);
    if (forms.length !== formIds.length)
      throw new BadRequestException('یک یا چند فرم انتخاب‌شده معتبر نیست');
    if (users.length !== userIds.length)
      throw new BadRequestException('یک یا چند کاربر انتخاب‌شده معتبر نیست');
  }

  async createFlow(dto: CreateProductionFlowDto, user: AuthenticatedUser) {
    await this.validateReferences(dto);
    return this.prisma.productionFlow.create({
      data: {
        name: dto.name,
        code: dto.code?.trim() || null,
        description: dto.description,
        isActive: dto.isActive ?? true,
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
          })),
        },
      },
      include: this.flowInclude(),
    });
  }

  async updateFlow(id: string, dto: UpdateProductionFlowDto) {
    const flow = await this.prisma.productionFlow.findUnique({
      where: { id },
      include: { runs: { take: 1 } },
    });
    if (!flow) throw new NotFoundException('خط تولید پیدا نشد');
    if (flow.runs.length)
      throw new BadRequestException(
        'این Flow قبلاً اجرا شده است؛ برای حفظ تاریخچه، آن را غیرفعال و یک Flow جدید ایجاد کنید',
      );
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
            })),
          },
        },
        include: this.flowInclude(),
      });
    });
  }

  async deleteFlow(id: string) {
    const runs = await this.prisma.productionRun.count({
      where: { flowId: id },
    });
    if (runs) {
      return this.prisma.productionFlow.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.productionFlow.delete({ where: { id } });
  }

  async getCatalog() {
    const [forms, users] = await Promise.all([
      this.prisma.form.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          customId: true,
          description: true,
          version: true,
        },
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
      steps: {
        orderBy: { stepOrder: 'asc' as const },
        include: {
          form: {
            select: {
              id: true,
              name: true,
              customId: true,
              description: true,
              version: true,
            },
          },
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
    const count = await this.prisma.productionRun.count({
      where: { referenceNo: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  async startRun(
    flowId: string,
    dto: StartProductionRunDto,
    user: AuthenticatedUser,
  ) {
    const flow = await this.prisma.productionFlow.findUnique({
      where: { id: flowId, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!flow) throw new NotFoundException('خط تولید فعال پیدا نشد');
    if (!flow.steps.length)
      throw new BadRequestException('این خط تولید هیچ مرحله‌ای ندارد');
    const referenceNo = await this.nextReferenceNo();
    return this.prisma.productionRun.create({
      data: {
        flowId,
        title: dto.title,
        referenceNo,
        startedById: user.id,
        currentStepOrder: 1,
        metadata: dto.metadata as any,
        steps: {
          create: flow.steps.map((s) => ({
            flowStepId: s.id,
            stepOrder: s.stepOrder,
            name: s.name,
            description: s.description,
            formId: s.formId,
            assigneeUserId: s.assigneeUserId,
            supervisorUserId: s.supervisorUserId,
            approverUserId: s.approverUserId,
            status: s.stepOrder === 1 ? 'READY' : 'LOCKED',
          })),
        },
      },
      include: this.runInclude(),
    });
  }

  async listRuns(user?: AuthenticatedUser) {
    return this.prisma.productionRun.findMany({
      orderBy: { updatedAt: 'desc' },
      include: this.runInclude(),
    });
  }

  async myTasks(userId: string) {
    return this.prisma.productionRunStep.findMany({
      where: {
        OR: [
          {
            assigneeUserId: userId,
            status: { in: ['READY', 'IN_PROGRESS', 'NEEDS_REVISION'] },
          },
          { supervisorUserId: userId, status: 'WAITING_SUPERVISOR' },
          { approverUserId: userId, status: 'WAITING_APPROVAL' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        run: {
          select: {
            id: true,
            title: true,
            referenceNo: true,
            status: true,
            flow: { select: { id: true, name: true } },
          },
        },
        assignee: { select: userSelect },
        supervisor: { select: userSelect },
        approver: { select: userSelect },
        submission: true,
      },
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id },
      include: this.runInclude(),
    });
    if (!run) throw new NotFoundException('اجرای تولید پیدا نشد');
    return run;
  }

  private runInclude() {
    return {
      flow: { select: { id: true, name: true, code: true } },
      startedBy: { select: userSelect },
      steps: {
        orderBy: { stepOrder: 'asc' as const },
        include: {
          assignee: { select: userSelect },
          supervisor: { select: userSelect },
          approver: { select: userSelect },
          submission: { include: { user: { select: userSelect } } },
          reviews: {
            orderBy: { createdAt: 'asc' as const },
            include: { reviewer: { select: userSelect } },
          },
        },
      },
    };
  }

  async beginStep(runId: string, stepId: string, user: AuthenticatedUser) {
    const step = await this.getRunStep(runId, stepId);
    if (step.assigneeUserId !== user.id)
      throw new ForbiddenException(
        'فقط مسئول این مرحله می‌تواند آن را شروع کند',
      );
    if (!['READY', 'NEEDS_REVISION'].includes(step.status))
      throw new BadRequestException('این مرحله آماده شروع نیست');
    return this.prisma.productionRunStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', startedAt: step.startedAt ?? new Date() },
    });
  }

  async submitStep(
    runId: string,
    stepId: string,
    dto: SubmitProductionStepDto,
    user: AuthenticatedUser,
  ) {
    const step = await this.getRunStep(runId, stepId);
    if (step.assigneeUserId !== user.id)
      throw new ForbiddenException(
        'فقط مسئول این مرحله می‌تواند فرم را ثبت کند',
      );
    if (!['READY', 'IN_PROGRESS', 'NEEDS_REVISION'].includes(step.status))
      throw new BadRequestException('در وضعیت فعلی امکان ثبت فرم وجود ندارد');

    const submission = await this.submissions.create(
      { formId: step.formId, data: dto.data },
      user.id,
    );
    const nextStatus = step.supervisorUserId
      ? 'WAITING_SUPERVISOR'
      : step.approverUserId
        ? 'WAITING_APPROVAL'
        : 'COMPLETED';

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
    if (nextStatus === 'COMPLETED')
      await this.advanceRun(runId, step.stepOrder);
    return this.getRun(runId);
  }

  async reviewStep(
    runId: string,
    stepId: string,
    type: 'SUPERVISOR' | 'APPROVER',
    dto: ReviewProductionStepDto,
    user: AuthenticatedUser,
  ) {
    const step = await this.getRunStep(runId, stepId);
    const isSupervisor = type === 'SUPERVISOR';
    const expectedUser = isSupervisor
      ? step.supervisorUserId
      : step.approverUserId;
    const expectedStatus = isSupervisor
      ? 'WAITING_SUPERVISOR'
      : 'WAITING_APPROVAL';
    if (expectedUser !== user.id)
      throw new ForbiddenException('شما تأییدکننده این مرحله نیستید');
    if (step.status !== expectedStatus)
      throw new BadRequestException('این مرحله در انتظار بررسی شما نیست');
    if (!['APPROVED', 'REJECTED'].includes(dto.action))
      throw new BadRequestException('عملیات بررسی نامعتبر است');

    await this.prisma.productionStepReview.create({
      data: {
        runStepId: step.id,
        reviewerId: user.id,
        type,
        action: dto.action,
        comment: dto.comment,
      },
    });
    if (dto.action === 'REJECTED') {
      await this.prisma.productionRunStep.update({
        where: { id: step.id },
        data: {
          status: 'NEEDS_REVISION',
          submissionId: null,
          submittedAt: null,
          completedAt: null,
        },
      });
      return this.getRun(runId);
    }

    if (isSupervisor && step.approverUserId) {
      await this.prisma.productionRunStep.update({
        where: { id: step.id },
        data: { status: 'WAITING_APPROVAL' },
      });
    } else {
      await this.prisma.productionRunStep.update({
        where: { id: step.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await this.advanceRun(runId, step.stepOrder);
    }
    return this.getRun(runId);
  }

  async setRunStatus(runId: string, action: 'pause' | 'resume' | 'cancel') {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('اجرای تولید پیدا نشد');
    if (action === 'cancel')
      return this.prisma.productionRun.update({
        where: { id: runId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    if (action === 'pause')
      return this.prisma.productionRun.update({
        where: { id: runId },
        data: { status: 'PAUSED' },
      });
    return this.prisma.productionRun.update({
      where: { id: runId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  private async getRunStep(runId: string, stepId: string) {
    const step = await this.prisma.productionRunStep.findFirst({
      where: { id: stepId, runId },
    });
    if (!step) throw new NotFoundException('مرحله تولید پیدا نشد');
    const run = await this.prisma.productionRun.findUnique({
      where: { id: runId },
    });
    if (!run || run.status !== 'IN_PROGRESS')
      throw new BadRequestException('این اجرای تولید فعال نیست');
    return step;
  }

  private async advanceRun(runId: string, completedOrder: number) {
    const next = await this.prisma.productionRunStep.findFirst({
      where: { runId, stepOrder: completedOrder + 1 },
    });
    if (next) {
      await this.prisma.$transaction([
        this.prisma.productionRunStep.update({
          where: { id: next.id },
          data: { status: 'READY' },
        }),
        this.prisma.productionRun.update({
          where: { id: runId },
          data: { currentStepOrder: next.stepOrder },
        }),
      ]);
      return;
    }
    await this.prisma.productionRun.update({
      where: { id: runId },
      data: {
        status: 'COMPLETED',
        currentStepOrder: null,
        completedAt: new Date(),
      },
    });
  }
}
