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

  async getApprovalStatus(submissionId: string) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { submissionId },
      include: {
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

    // Get total steps count
    const policy = await this.prisma.approvalPolicy.findFirst({
      where: { steps: { some: {} } },
      include: { steps: true },
    });
    const totalSteps = policy?.steps.length ?? 0;

    return {
      submissionId,
      status: instance.status,
      currentStepOrder: instance.currentStepOrder,
      totalSteps,
      actions: instance.actions,
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

    // Create approval action
    const action = await this.prisma.approvalAction.create({
      data: {
        instanceId: instance.id,
        stepId: step.id,
        approverId: user.id,
        action: dto.action,
        comments: dto.comments,
      },
    });

    // Handle rejection
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
