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
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';

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
