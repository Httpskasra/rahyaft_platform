import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { ProductionService } from './production.service';
import { CreateProductionFlowDto, ReviewProductionStepDto, StartProductionRunDto, SubmitProductionStepDto, UpdateProductionFlowDto } from './dto/production.dto';

@ApiTags('Production')
@ApiBearerAuth('access-token')
@Controller('production')
export class ProductionController {
  constructor(private readonly service: ProductionService) {}

  @Get('catalog')
  @RequirePermission({ action: 'create', resource: 'production-flows' })
  catalog() { return this.service.getCatalog(); }

  @Get('flows')
  @RequirePermission({ action: 'read', resource: 'production-flows' })
  listFlows() { return this.service.listFlows(); }

  @Get('flows/:id')
  @RequirePermission({ action: 'read', resource: 'production-flows' })
  getFlow(@Param('id', ParseUUIDPipe) id: string) { return this.service.getFlow(id); }

  @Post('flows')
  @RequirePermission({ action: 'create', resource: 'production-flows' })
  createFlow(@Body() dto: CreateProductionFlowDto, @CurrentUser() user: AuthenticatedUser) { return this.service.createFlow(dto, user); }

  @Patch('flows/:id')
  @RequirePermission({ action: 'update', resource: 'production-flows' })
  updateFlow(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductionFlowDto) { return this.service.updateFlow(id, dto); }

  @Delete('flows/:id')
  @RequirePermission({ action: 'delete', resource: 'production-flows' })
  deleteFlow(@Param('id', ParseUUIDPipe) id: string) { return this.service.deleteFlow(id); }

  @Post('flows/:id/runs')
  @RequirePermission({ action: 'create', resource: 'production-runs' })
  startRun(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StartProductionRunDto, @CurrentUser() user: AuthenticatedUser) { return this.service.startRun(id, dto, user); }

  @Get('runs')
  @RequirePermission({ action: 'read', resource: 'production-runs' })
  listRuns(@CurrentUser() user: AuthenticatedUser) { return this.service.listRuns(user); }

  @Get('tasks/my')
  @RequirePermission({ action: 'read', resource: 'production-runs' })
  myTasks(@CurrentUser() user: AuthenticatedUser) { return this.service.myTasks(user.id); }

  @Get('runs/:id')
  @RequirePermission({ action: 'read', resource: 'production-runs' })
  getRun(@Param('id', ParseUUIDPipe) id: string) { return this.service.getRun(id); }

  @Post('runs/:runId/steps/:stepId/begin')
  @RequirePermission({ action: 'update', resource: 'production-runs' })
  begin(@Param('runId', ParseUUIDPipe) runId: string, @Param('stepId', ParseUUIDPipe) stepId: string, @CurrentUser() user: AuthenticatedUser) { return this.service.beginStep(runId, stepId, user); }

  @Post('runs/:runId/steps/:stepId/submit')
  @RequirePermission({ action: 'update', resource: 'production-runs' })
  submit(@Param('runId', ParseUUIDPipe) runId: string, @Param('stepId', ParseUUIDPipe) stepId: string, @Body() dto: SubmitProductionStepDto, @CurrentUser() user: AuthenticatedUser) { return this.service.submitStep(runId, stepId, dto, user); }

  @Post('runs/:runId/steps/:stepId/supervisor-review')
  @RequirePermission({ action: 'update', resource: 'production-runs' })
  supervisorReview(@Param('runId', ParseUUIDPipe) runId: string, @Param('stepId', ParseUUIDPipe) stepId: string, @Body() dto: ReviewProductionStepDto, @CurrentUser() user: AuthenticatedUser) { return this.service.reviewStep(runId, stepId, 'SUPERVISOR', dto, user); }

  @Post('runs/:runId/steps/:stepId/approval')
  @RequirePermission({ action: 'update', resource: 'production-runs' })
  approval(@Param('runId', ParseUUIDPipe) runId: string, @Param('stepId', ParseUUIDPipe) stepId: string, @Body() dto: ReviewProductionStepDto, @CurrentUser() user: AuthenticatedUser) { return this.service.reviewStep(runId, stepId, 'APPROVER', dto, user); }

  @Post('runs/:runId/:action')
  @RequirePermission({ action: 'update', resource: 'production-runs' })
  status(@Param('runId', ParseUUIDPipe) runId: string, @Param('action') action: 'pause' | 'resume' | 'cancel') { return this.service.setRunStatus(runId, action); }
}
