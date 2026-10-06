import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AnalyticsAiService } from '../analytics-ai/analytics-ai.service';
import { AskAnalyticsDto } from '../analytics-ai/dto/ask-analytics.dto';

@ApiTags('Forms')
@ApiBearerAuth('access-token')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService, private readonly analyticsAi: AnalyticsAiService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'forms' })
  create(@Body() dto: CreateFormDto, @CurrentUser() user: AuthenticatedUser) {
    return this.formsService.create(dto, user.id);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'forms' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.formsService.findAll(user.id);
  }


  @Get('analytics/overview')
  @RequirePermission({ action: 'read', resource: 'forms' })
  getAnalyticsOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.formsService.getAnalyticsOverview(user.id, { range, from, to });
  }


  @Post('analytics/ai-summary')
  @RequirePermission({ action: 'read', resource: 'forms' })
  async getOverviewAiSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('range') range?: string,
  ) {
    const analytics = await this.formsService.getAnalyticsOverview(user.id, { range });
    return this.analyticsAi.summarize('forms-overview', analytics);
  }

  @Post('analytics/ask')
  @RequirePermission({ action: 'read', resource: 'forms' })
  async askOverviewAnalytics(
    @Body() dto: AskAnalyticsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('range') range?: string,
  ) {
    const analytics = await this.formsService.getAnalyticsOverview(user.id, { range });
    return this.analyticsAi.ask('forms-overview', dto.question, analytics);
  }

  @Get('manage/all')
  @RequirePermission({ action: 'read', resource: 'forms' })
  findManaged(@CurrentUser() user: AuthenticatedUser) {
    return this.formsService.findManaged(user.id);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'forms' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.findById(id);
  }


  @Get(':id/analytics')
  @RequirePermission({ action: 'read', resource: 'forms' })
  getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.formsService.getAnalytics(id, { range, from, to });
  }



  @Post(':id/analytics/ai-summary')
  @RequirePermission({ action: 'read', resource: 'forms' })
  async getFormAiSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('range') range?: string,
  ) {
    const analytics = await this.formsService.getAnalytics(id, { range });
    return this.analyticsAi.summarize('form', analytics);
  }

  @Post(':id/analytics/ask')
  @RequirePermission({ action: 'read', resource: 'forms' })
  async askFormAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AskAnalyticsDto,
    @Query('range') range?: string,
  ) {
    const analytics = await this.formsService.getAnalytics(id, { range });
    return this.analyticsAi.ask('form', dto.question, analytics);
  }

  @Patch(':id/sla')
  @RequirePermission({ action: 'update', resource: 'forms' })
  updateSla(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { slaHours?: number | null; steps?: Array<{ stepId: string; slaHours: number | null }> },
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.formsService.updateSla(id, user.id, body); }

  @Get(':id/stats')
  @RequirePermission({ action: 'read', resource: 'forms' })
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.getStats(id);
  }

  /**
   * GET /forms/:id/deep-analysis
   *
   * Returns a single rich payload containing:
   *  - Full form metadata + schema
   *  - All raw submissions (with user info)
   *  - All analytics worker outputs:
   *      riskAssessment, anomalyDetection, formCategory,
   *      domainClassification, domainInsights (HR/Product/Survey/…),
   *      completionHealth, trendAnalysis, predictions,
   *      submissionHistory
   *  - Per-field rolling stats (statsByField)
   *  - Per-field NLP analysis (nlpByField)
   */
  @Get(':id/deep-analysis')
  @RequirePermission({ action: 'read', resource: 'forms' })
  getDeepAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.getDeepAnalysis(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'forms' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'delete', resource: 'forms' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formsService.remove(id, user.id);
  }
}
