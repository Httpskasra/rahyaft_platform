import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { EvaluationKind } from '../../generated/prisma/client';
import {
  CreateQuestionDto,
  KindParamDto,
  ReorderQuestionsDto,
  SubmitEvaluationDto,
  UpdateQuestionDto,
  UpdateTemplateDto,
} from './dto/evaluation.dto';
import { EvaluationService } from './evaluation.service';
import { IsEnum, IsOptional } from 'class-validator';

class ListEvaluationsQuery {
  @IsOptional()
  @IsEnum(EvaluationKind)
  kind?: EvaluationKind;
}

/** فرم‌ساز: kind = INITIAL | PERIODIC */
@Controller('commerce/evaluation-templates')
export class EvaluationTemplatesController {
  constructor(private readonly service: EvaluationService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'commerce' })
  list() {
    return this.service.listTemplates();
  }

  @Get(':kind')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  get(@Param() p: KindParamDto) {
    return this.service.getTemplate(p.kind);
  }

  @Patch(':kind')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  update(@Param() p: KindParamDto, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(p.kind, dto);
  }

  @Post(':kind/questions')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  addQuestion(@Param() p: KindParamDto, @Body() dto: CreateQuestionDto) {
    return this.service.addQuestion(p.kind, dto);
  }

  // قبل از :questionId تا با آن اشتباه گرفته نشود
  @Put(':kind/questions/reorder')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  reorder(@Param() p: KindParamDto, @Body() dto: ReorderQuestionsDto) {
    return this.service.reorderQuestions(p.kind, dto.questionIds);
  }

  @Patch(':kind/questions/:questionId')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  updateQuestion(
    @Param() p: KindParamDto,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.updateQuestion(p.kind, questionId, dto);
  }

  @Delete(':kind/questions/:questionId')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  removeQuestion(
    @Param() p: KindParamDto,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.service.removeQuestion(p.kind, questionId);
  }
}

/** ثبت و مشاهده ارزیابی‌های یک تامین‌کننده */
@Controller('commerce/suppliers/:supplierId/evaluations')
export class SupplierEvaluationsController {
  constructor(private readonly service: EvaluationService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'commerce' })
  list(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Query() q: ListEvaluationsQuery,
  ) {
    return this.service.listForSupplier(supplierId, q.kind);
  }

  @Post(':kind')
  @RequirePermission({ action: 'create', resource: 'commerce' })
  submit(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Param() p: KindParamDto,
    @Body() dto: SubmitEvaluationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submit(supplierId, p.kind, dto, user?.id);
  }
}
