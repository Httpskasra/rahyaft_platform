import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FormSubmissionsService } from './form-submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from 'src/common/interfaces/auth.interface';

@Controller('form-submissions')
export class FormSubmissionsController {
  constructor(private readonly service: FormSubmissionsService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'form-submissions' })
  create(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Get('form/:formId')
  @RequirePermission({ action: 'read', resource: 'form-submissions' })
  findByForm(@Param('formId', ParseUUIDPipe) formId: string) {
    return this.service.findByForm(formId);
  }

  @Get('my')
  @RequirePermission({ action: 'read', resource: 'form-submissions' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findByUser(user.id);
  }
}
