/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalStatus } from '../generated/prisma/enums';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';
import { ApproveStepDto } from './dto/approve-step.dto';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Policy Management (for form owners/admins)
  // ─────────────────────────────────────────────

  async createOrUpdatePolicy(formId: string, dto: CreateApprovalPolicyDto) {
    // Verify form exists
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    // Use transaction to replace existing policy
    return this.prisma.$transaction(async (tx) => {
      // Delete existing policy and its steps (cascade)
      await tx.approvalPolicy.deleteMany({ where: { formId } });

      if (!dto.steps || dto.steps.length === 0) {
        return { message: 'Approval policy removed' };
      }

      // Create new policy
      const policy = await tx.approvalPolicy.create({
        data: { formId },
      });

      // Create steps
      for (const step of dto.steps) {
        await tx.approvalStep.create({
          data: {
            policyId: policy.id,
            stepOrder: step.stepOrder,
            roleId: step.roleId,
          },
        });
      }

      return policy;
    });
  }

  async getPolicyByForm(formId: string) {
    const policy = await this.prisma.approvalPolicy.findUnique({
      where: { formId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { role: { select: { id: true, name: true } } },
        },
      },
    });
    return policy;
  }

  // ─────────────────────────────────────────────
  // Approval Instance & Actions
  // ─────────────────────────────────────────────

  async getInbox(user: AuthenticatedUser) {
    const roleIds = user.roles.map((role) => role.id);

    const [signatureUser, pendingCandidates, historyActions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { signatureStorageKey: true, signatureMimeType: true },
      }),
      this.prisma.approvalInstance.findMany({
        where: { status: 'PENDING' },
        orderBy: { updatedAt: 'desc' },
        include: {
          submission: {
            include: {
              user: { select: { id: true, name: true, phoneNumber: true } },
              form: {
                select: {
                  id: true,
                  name: true,
                  customId: true,
                  description: true,
                  schema: true,
                  approvalPolicies: {
                    select: {
                      steps: {
                        select: {
                          id: true,
                          stepOrder: true,
                          roleId: true,
                          role: { select: { id: true, name: true } },
                        },
                        orderBy: { stepOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
          actions: {
            orderBy: { createdAt: 'asc' },
            include: {
              step: { include: { role: { select: { id: true, name: true } } } },
              approver: { select: { id: true, name: true, phoneNumber: true } },
            },
          },
        },
      }),
      this.prisma.approvalAction.findMany({
        where: { approverId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          step: { include: { role: { select: { id: true, name: true } } } },
          instance: {
            include: {
              submission: {
                include: {
                  user: { select: { id: true, name: true, phoneNumber: true } },
                  form: { select: { id: true, name: true, customId: true, description: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const pending = pendingCandidates
      .map((instance) => {
        const steps = instance.submission.form.approvalPolicies[0]?.steps ?? [];
        const currentStep = steps.find(
          (step) => step.stepOrder === instance.currentStepOrder,
        );
        if (!currentStep || !roleIds.includes(currentStep.roleId)) return null;
        return {
          id: instance.id,
          submissionId: instance.submissionId,
          status: instance.status,
          currentStepOrder: instance.currentStepOrder,
          totalSteps: steps.length,
          updatedAt: instance.updatedAt,
          createdAt: instance.createdAt,
          form: {
            id: instance.submission.form.id,
            name: instance.submission.form.name,
            customId: instance.submission.form.customId,
            description: instance.submission.form.description,
          },
          submitter: instance.submission.user,
          submissionCreatedAt: instance.submission.createdAt,
          currentRole: currentStep.role,
          previousActions: instance.actions.map((action) => ({
            id: action.id,
            action: action.action,
            comments: action.comments,
            createdAt: action.createdAt,
            approver: action.approver,
            step: { stepOrder: action.step.stepOrder, role: action.step.role },
          })),
        };
      })
      .filter(Boolean);

    const history = historyActions.map((action) => ({
      id: action.id,
      submissionId: action.instance.submissionId,
      action: action.action,
      comments: action.comments,
      createdAt: action.createdAt,
      step: { stepOrder: action.step.stepOrder, role: action.step.role },
      workflowStatus: action.instance.status,
      form: action.instance.submission.form,
      submitter: action.instance.submission.user,
      submissionCreatedAt: action.instance.submission.createdAt,
    }));

    return {
      signatureConfigured: Boolean(
        signatureUser?.signatureStorageKey && signatureUser.signatureMimeType,
      ),
      stats: {
        pending: pending.length,
        approved: history.filter((item) => item.action === 'APPROVED').length,
        rejected: history.filter((item) => item.action === 'REJECTED').length,
        processed: history.length,
      },
      pending,
      history,
    };
  }

  async getInboxDetail(submissionId: string, user: AuthenticatedUser) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { submissionId },
      include: {
        submission: {
          include: {
            user: { select: { id: true, name: true, phoneNumber: true } },
            form: {
              select: {
                id: true,
                name: true,
                customId: true,
                description: true,
                schema: true,
                approvalPolicies: {
                  select: {
                    steps: {
                      orderBy: { stepOrder: 'asc' },
                      include: { role: { select: { id: true, name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        actions: {
          orderBy: { createdAt: 'asc' },
          include: {
            step: { include: { role: { select: { id: true, name: true } } } },
            approver: { select: { id: true, name: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!instance) throw new NotFoundException('No approval workflow found');

    const steps = instance.submission.form.approvalPolicies[0]?.steps ?? [];
    const currentStep = steps.find(
      (step) => step.stepOrder === instance.currentStepOrder,
    );
    const roleIds = user.roles.map((role) => role.id);
    const hasActed = instance.actions.some((action) => action.approverId === user.id);
    const canAct =
      instance.status === 'PENDING' &&
      Boolean(currentStep && roleIds.includes(currentStep.roleId));

    if (!canAct && !hasActed) {
      throw new ForbiddenException('This approval is not assigned to you');
    }

    const actions = await Promise.all(
      instance.actions.map(async (action) => ({
        id: action.id,
        action: action.action,
        comments: action.comments,
        createdAt: action.createdAt,
        approver: action.approver,
        step: { stepOrder: action.step.stepOrder, role: action.step.role },
        signatureDataUrl: await this.readSignatureDataUrl(
          action.signatureStorageKey,
          action.signatureMimeType,
        ),
      })),
    );

    return {
      submissionId: instance.submissionId,
      status: instance.status,
      currentStepOrder: instance.currentStepOrder,
      totalSteps: steps.length,
      canAct,
      currentRole: currentStep?.role ?? null,
      form: {
        id: instance.submission.form.id,
        name: instance.submission.form.name,
        customId: instance.submission.form.customId,
        description: instance.submission.form.description,
        schema: instance.submission.form.schema,
      },
      submission: {
        id: instance.submission.id,
        formVersion: instance.submission.formVersion,
        data: instance.submission.data,
        createdAt: instance.submission.createdAt,
        user: instance.submission.user,
      },
      steps: steps.map((step) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        role: step.role,
      })),
      actions,
    };
  }

  async getApprovalStatus(submissionId: string) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { submissionId },
      include: {
        submission: { select: { formId: true } },
        actions: {
          include: {
            step: { include: { role: true } },
            approver: { select: { id: true, name: true, phoneNumber: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('No approval workflow for this submission');
    }

    const actions = await Promise.all(
      instance.actions.map(async (action) => ({
        ...action,
        signatureDataUrl: await this.readSignatureDataUrl(
          action.signatureStorageKey,
          action.signatureMimeType,
        ),
      })),
    );

    // Get total steps count
    const policy = await this.prisma.approvalPolicy.findUnique({
      where: { formId: instance.submission.formId },
      include: { steps: true },
    });
    const totalSteps = policy?.steps.length ?? 0;

    return {
      submissionId,
      status: instance.status,
      currentStepOrder: instance.currentStepOrder,
      totalSteps,
      actions,
      isCompleted:
        instance.status === 'APPROVED' || instance.status === 'REJECTED',
    };
  }

  async approveStep(
    submissionId: string,
    dto: ApproveStepDto,
    user: AuthenticatedUser,
  ) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { submissionId },
      include: {
        submission: { select: { formId: true } },
        actions: { include: { step: true } },
      },
    });

    if (!instance) throw new NotFoundException('No approval workflow found');
    if (instance.status !== 'PENDING') {
      throw new BadRequestException(
        `Workflow already ${instance.status.toLowerCase()}`,
      );
    }

    // Verify correct step order
    if (instance.currentStepOrder !== dto.stepOrder) {
      throw new BadRequestException(
        `Expected step order ${instance.currentStepOrder}, got ${dto.stepOrder}`,
      );
    }

    // Get the step definition
    const step = await this.prisma.approvalStep.findFirst({
      where: {
        policy: { formId: instance.submission.formId },
        stepOrder: dto.stepOrder,
      },
      include: { role: true },
    });
    if (!step) throw new NotFoundException('Step definition missing');

    // Check if user has the required role
    const userRoles = user.roles.map((r) => r.id);
    if (!userRoles.includes(step.roleId)) {
      throw new ForbiddenException(
        `You need role "${step.role.name}" to approve this step`,
      );
    }

    // Check if already approved by someone else
    const existingAction = await this.prisma.approvalAction.findFirst({
      where: { instanceId: instance.id, stepId: step.id },
    });
    if (existingAction) {
      throw new BadRequestException('This step has already been processed');
    }

    const signature = await this.snapshotUserSignature(user.id);

    // Create approval action
    const action = await this.prisma.approvalAction.create({
      data: {
        instanceId: instance.id,
        stepId: step.id,
        approverId: user.id,
        action: dto.action,
        comments: dto.comments,
        signatureStorageKey: signature.storageKey,
        signatureMimeType: signature.mimeType,
      },
    });

    // Handle rejection
    if (dto.action === 'REJECTED' && !dto.comments?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (dto.action === 'REJECTED') {
      await this.prisma.approvalInstance.update({
        where: { id: instance.id },
        data: { status: 'REJECTED', currentStepOrder: null },
      });
      return { message: 'Submission rejected', action };
    }

    // Handle approval: find next step
    const nextStep = await this.prisma.approvalStep.findFirst({
      where: {
        policy: { formId: instance.submission.formId },
        stepOrder: dto.stepOrder + 1,
      },
    });

    if (!nextStep) {
      // Workflow complete
      await this.prisma.approvalInstance.update({
        where: { id: instance.id },
        data: { status: 'APPROVED', currentStepOrder: null },
      });
      return { message: 'Submission fully approved', action };
    }

    // Move to next step
    await this.prisma.approvalInstance.update({
      where: { id: instance.id },
      data: { currentStepOrder: nextStep.stepOrder },
    });

    return {
      message: `Step ${dto.stepOrder} approved, now at step ${nextStep.stepOrder}`,
      action,
    };
  }

  private async snapshotUserSignature(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { signatureStorageKey: true, signatureMimeType: true },
    });

    if (!user?.signatureStorageKey || !user.signatureMimeType) {
      throw new BadRequestException(
        'You must upload a signature before approving or rejecting forms',
      );
    }

    const source = join(
      process.cwd(),
      'uploads',
      'signatures',
      'users',
      user.signatureStorageKey,
    );
    const dir = join(process.cwd(), 'uploads', 'signatures', 'approvals');
    await mkdir(dir, { recursive: true });
    const storageKey = `${randomUUID()}${extname(user.signatureStorageKey)}`;
    await copyFile(source, join(dir, storageKey));

    return { storageKey, mimeType: user.signatureMimeType };
  }

  private async readSignatureDataUrl(
    storageKey?: string | null,
    mimeType?: string | null,
  ): Promise<string | null> {
    if (!storageKey || !mimeType) return null;
    try {
      const buffer = await readFile(
        join(process.cwd(), 'uploads', 'signatures', 'approvals', storageKey),
      );
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  // Internal method called after submission creation
  async createApprovalInstance(submissionId: string, formId: string) {
    const policy = await this.prisma.approvalPolicy.findUnique({
      where: { formId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!policy || policy.steps.length === 0) return null;

    const firstStepOrder = policy.steps[0]?.stepOrder;
    if (!firstStepOrder) return null;

    return this.prisma.approvalInstance.create({
      data: {
        submissionId,
        currentStepOrder: firstStepOrder,
        status: 'PENDING',
      },
    });
  }
}
