I'll implement the approval workflow feature for forms (applications) in your backend. Below are all the file changes and additions needed.

## 1. Prisma Schema Changes

**File: `prisma/schema.prisma`** (append these models after existing ones, before closing)

```prisma
// ─── Approval Workflow ────────────────────────────────────────

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

model ApprovalPolicy {
  id        String   @id @default(uuid())
  formId    String   @unique
  form      Form     @relation(fields: [formId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  steps ApprovalStep[]
}

model ApprovalStep {
  id        String         @id @default(uuid())
  policyId  String
  policy    ApprovalPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  stepOrder Int
  roleId    String
  role      Role           @relation(fields: [roleId], references: [id])
  createdAt DateTime       @default(now())

  @@unique([policyId, stepOrder])
}

model ApprovalInstance {
  id               String           @id @default(uuid())
  submissionId     String           @unique
  submission       FormSubmission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  status           ApprovalStatus   @default(PENDING)
  currentStepOrder Int?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  actions ApprovalAction[]
}

model ApprovalAction {
  id         String           @id @default(uuid())
  instanceId String
  instance   ApprovalInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepId     String
  step       ApprovalStep     @relation(fields: [stepId], references: [id])
  approverId String
  approver   User             @relation(fields: [approverId], references: [id])
  action     ApprovalStatus
  comments   String?
  createdAt  DateTime         @default(now())
}
```

Then run:
```bash
npx prisma migrate dev --name add_approval_workflow
npx prisma generate
```

## 2. New Module: Approvals

**File: `src/approvals/approvals.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
```

**File: `src/approvals/approvals.service.ts`**

```typescript
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
            stepOrder: step.order,
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
      isCompleted: instance.status === 'APPROVED' || instance.status === 'REJECTED',
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
    const userRoles = user.roles.map(r => r.id);
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
```

**File: `src/approvals/approvals.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';
import { ApproveStepDto } from './dto/approve-step.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // Policy endpoints (for form owners)
  @Get('forms/:formId/policy')
  @RequirePermission({ action: 'read', resource: 'forms' })
  getPolicy(@Param('formId', ParseUUIDPipe) formId: string) {
    return this.approvalsService.getPolicyByForm(formId);
  }

  @Put('forms/:formId/policy')
  @RequirePermission({ action: 'update', resource: 'forms' })
  upsertPolicy(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: CreateApprovalPolicyDto,
  ) {
    return this.approvalsService.createOrUpdatePolicy(formId, dto);
  }

  @Delete('forms/:formId/policy')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'update', resource: 'forms' })
  async deletePolicy(@Param('formId', ParseUUIDPipe) formId: string) {
    await this.approvalsService.createOrUpdatePolicy(formId, { steps: [] });
  }

  // Approval status & actions
  @Get('submissions/:submissionId/status')
  @RequirePermission({ action: 'read', resource: 'form-submissions' })
  getStatus(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.approvalsService.getApprovalStatus(submissionId);
  }

  @Post('submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: 'approve', resource: 'approvals' })
  approveStep(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ApproveStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.approveStep(submissionId, dto, user);
  }
}
```

**File: `src/approvals/dto/create-approval-policy.dto.ts`**

```typescript
import { IsArray, IsUUID, IsInt, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PolicyStepDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsUUID()
  roleId: string;
}

export class CreateApprovalPolicyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyStepDto)
  steps: PolicyStepDto[];
}
```

**File: `src/approvals/dto/approve-step.dto.ts`**

```typescript
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApprovalStatus } from '../../generated/prisma/enums';

export class ApproveStepDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsEnum(ApprovalStatus)
  action: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  comments?: string;
}
```

## 3. Modify Existing Modules

**File: `src/app.module.ts`** (add ApprovalsModule to imports)

```typescript
// Add to existing imports array:
import { ApprovalsModule } from './approvals/approvals.module';

// Inside @Module imports:
ApprovalsModule,
```

**File: `src/form-submissions/form-submissions.service.ts`** (integrate approval creation)

```typescript
// Add import at top:
import { ApprovalsService } from '../approvals/approvals.service';

// Modify constructor:
constructor(
  private readonly prisma: PrismaService,
  private readonly rabbit: RabbitMQService,
  private readonly approvalsService: ApprovalsService, // 👈 add this
) {}

// Modify create method - after creating submission, add approval instance:
async create(dto: CreateSubmissionDto, userId: string) {
  const form = await this.prisma.form.findUnique({
    where: { id: dto.formId, isActive: true },
  });
  if (!form) throw new NotFoundException('Form not found');

  const submission = await this.prisma.formSubmission.create({
    data: {
      formId: form.id,
      formVersion: form.version,
      userId,
      data: dto.data,
    },
  });

  // 👇 Create approval instance if policy exists
  await this.approvalsService.createApprovalInstance(submission.id, form.id);

  // RabbitMQ publish remains same
  this.rabbit
    .publish({
      id: submission.id,
      formId: submission.formId,
      formVersion: submission.formVersion,
      userId: submission.userId ?? undefined,
      data: submission.data as Record<string, unknown>,
      createdAt: submission.createdAt.toISOString(),
    })
    .catch((err) =>
      console.error('RabbitMQ publish error (non-fatal):', err),
    );

  return submission;
}
```

**File: `src/form-submissions/form-submissions.module.ts`** (add ApprovalsModule import)

```typescript
import { Module } from '@nestjs/common';
import { FormSubmissionsService } from './form-submissions.service';
import { FormSubmissionsController } from './form-submissions.controller';
import { ApprovalsModule } from '../approvals/approvals.module'; // 👈 add

@Module({
  imports: [ApprovalsModule], // 👈 add
  controllers: [FormSubmissionsController],
  providers: [FormSubmissionsService],
  exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {}
```

## 4. New Permission for Approve Action

**File: `src/common/decorators/require-permission.decorator.ts`** (no change needed, just reference)

But you need to seed a new permission: `approve:approvals`. Add to your seed script:

**File: `prisma/seed.ts`** (modify the resources array)

```typescript
// Find this line:
const resources = ['users', 'roles', 'departments', 'forms', 'form-submissions'];

// Replace with:
const resources = ['users', 'roles', 'departments', 'forms', 'form-submissions', 'approvals'];
```

Also add to actions if not already: `approve` action should be added. Modify:

```typescript
const actions = ['create', 'read', 'update', 'delete', 'approve'];
```

Then re-run seed for superadmin:
```bash
npx prisma db seed
```

## 5. Additional Type Exports (if needed)

**File: `src/generated/prisma/enums.ts`** (auto-generated - do not edit manually, but after migration it will include ApprovalStatus)

## Summary of Changes

1. **Prisma schema** – Added 5 new models: ApprovalPolicy, ApprovalStep, ApprovalInstance, ApprovalAction, and ApprovalStatus enum
2. **New module** – `src/approvals/` with service, controller, and DTOs
3. **Modified** – `app.module.ts`, `form-submissions.service.ts`, `form-submissions.module.ts`
4. **Updated seed** – Added 'approvals' resource and 'approve' action

## API Endpoints (for your reference)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/approvals/forms/:formId/policy` | Set approval steps for a form |
| GET | `/api/v1/approvals/forms/:formId/policy` | Get current policy |
| DELETE | `/api/v1/approvals/forms/:formId/policy` | Remove policy |
| GET | `/api/v1/approvals/submissions/:submissionId/status` | View approval status + history |
| POST | `/api/v1/approvals/submissions/:submissionId/approve` | Approve/reject a step |

## Workflow Example

1. Admin creates a form (application)
2. Admin sets approval policy: step1=hr_role, step2=ceo_role
3. User submits the form → approval instance created with `currentStepOrder=1`
4. HR user (with hr_role) calls POST `/approve` with `{stepOrder:1, action:"APPROVED"}`
5. System moves to step 2
6. CEO approves → workflow marked `APPROVED`
7. Any user with read permission can check status via GET endpoint

Remember to run migration and seed after making these changes.