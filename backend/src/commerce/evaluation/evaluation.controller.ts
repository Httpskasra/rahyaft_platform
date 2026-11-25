import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EvaluationType, SupplierKind } from '../../generated/prisma/enums';
import { EvaluationService } from './evaluation.service';
import { PreviewEvaluationDto, SaveTemplateDto, ScoreSettingDto, SubmitEvaluationDto } from './dto/evaluation.dto';

@ApiTags('Commerce / Supplier evaluations')
@ApiBearerAuth('access-token')
@Controller('supplier-evaluations')
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Get('settings')
  @RequirePermission({ action: 'read', resource: 'supplier-evaluations' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @RequirePermission({ action: 'manage-settings', resource: 'supplier-evaluations' })
  saveSettings(@Body() dto: ScoreSettingDto, @CurrentUser('id') userId: string) {
    return this.service.saveSettings(dto, userId);
  }

  @Get('templates')
  @RequirePermission({ action: 'read', resource: 'supplier-evaluations' })
  templates(@Query('supplierKind') supplierKind?: SupplierKind, @Query('type') type?: EvaluationType) {
    return this.service.listTemplates(supplierKind, type);
  }

  @Get('templates/:supplierKind/:type/history')
  @RequirePermission({ action: 'manage-templates', resource: 'supplier-evaluations' })
  history(
    @Param('supplierKind', new ParseEnumPipe(SupplierKind)) supplierKind: SupplierKind,
    @Param('type', new ParseEnumPipe(EvaluationType)) type: EvaluationType,
  ) {
    return this.service.templateHistory(supplierKind, type);
  }

  @Put('templates/:supplierKind/:type')
  @RequirePermission({ action: 'manage-templates', resource: 'supplier-evaluations' })
  saveTemplate(
    @Param('supplierKind', new ParseEnumPipe(SupplierKind)) supplierKind: SupplierKind,
    @Param('type', new ParseEnumPipe(EvaluationType)) type: EvaluationType,
    @Body() dto: SaveTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.saveTemplate(supplierKind, type, dto, userId);
  }

  @Post('preview')
  @RequirePermission({ action: 'read', resource: 'supplier-evaluations' })
  preview(@Body() dto: PreviewEvaluationDto) {
    return this.service.preview(dto);
  }

  @Post('reminders/run')
  @RequirePermission({ action: 'manage-settings', resource: 'supplier-evaluations' })
  runReminders() {
    return this.service.runReminders();
  }

  @Get('suppliers/:supplierId')
  @RequirePermission({ action: 'read', resource: 'supplier-evaluations' })
  listForSupplier(@Param('supplierId', ParseUUIDPipe) supplierId: string) {
    return this.service.listForSupplier(supplierId);
  }

  @Post('suppliers/:supplierId')
  @RequirePermission({ action: 'create', resource: 'supplier-evaluations' })
  submit(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: SubmitEvaluationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.submit(supplierId, dto, userId);
  }
}
