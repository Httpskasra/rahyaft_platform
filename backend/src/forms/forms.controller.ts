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
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

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

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'forms' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.findById(id);
  }

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
