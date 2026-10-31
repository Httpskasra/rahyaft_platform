import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { RepairsService } from './repairs.service';

import { CreateRepairDto } from './dto/create-repair.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateRepairStatusDto } from './dto/update-repair-status.dto';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AnalyticsAiService } from 'src/analytics-ai/analytics-ai.service';
import { AskAnalyticsDto } from 'src/analytics-ai/dto/ask-analytics.dto';
import { QueryRepairsDto } from './dto/query-repairs.dto';

@ApiTags('Repairs')
@ApiBearerAuth('access-token')
@Controller('repairs')
export class RepairsController {
  constructor(
    private readonly repairsService: RepairsService,
    private readonly analyticsAi: AnalyticsAiService,
  ) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'repairs' })
  create(
    @Body()
    dto: CreateRepairDto,
  ) {
    return this.repairsService.create(dto);
  }

  @Get('sla-policies')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  getSlaPolicies() {
    return this.repairsService.getSlaPolicies();
  }

  @Patch('sla-policies')
  @RequirePermission({ action: 'update', resource: 'repairs' })
  updateSlaPolicies(
    @Body()
    body: {
      items: Array<{ type: any; targetHours: number; isActive?: boolean }>;
    },
  ) {
    return this.repairsService.updateSlaPolicies(body.items ?? []);
  }

  @Get('analytics/overview')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  analytics(
    @Req() req: any,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.repairsService.getAnalytics(req.user, req.matchedPermission, {
      range,
      from,
      to,
    });
  }

  @Post('analytics/ai-summary')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  async analyticsAiSummary(@Req() req: any, @Query('range') range?: string) {
    const analytics = await this.repairsService.getAnalytics(
      req.user,
      req.matchedPermission,
      { range },
    );
    return this.analyticsAi.summarize('repairs', analytics);
  }

  @Post('analytics/ask')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  async askAnalytics(
    @Body() dto: AskAnalyticsDto,
    @Req() req: any,
    @Query('range') range?: string,
  ) {
    const analytics = await this.repairsService.getAnalytics(
      req.user,
      req.matchedPermission,
      { range },
    );
    return this.analyticsAi.ask('repairs', dto.question, analytics);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'repairs' })
  findAll(@Req() req: any, @Query() query: QueryRepairsDto) {
    return this.repairsService.findAll(req.user, req.matchedPermission, query);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  findOne(
    @Param('id')
    id: string,

    @Req() req: any,
  ) {
    return this.repairsService.findOne(id, req.user, req.matchedPermission);
  }

  @Get(':id/status-logs/:logId/image')
  @RequirePermission({ action: 'read', resource: 'repairs' })
  async getStatusLogImage(
    @Param('id') id: string,
    @Param('logId') logId: string,
    @Req() req: any,
  ) {
    const image = await this.repairsService.getStatusLogImage(
      id,
      logId,
      req.user,
      req.matchedPermission,
    );
    return new StreamableFile(image.buffer, {
      type: image.mimeType,
      disposition: 'inline',
    });
  }

  @Patch(':id/assign')
  @RequirePermission({ action: 'assign', resource: 'repairs' })
  assignTechnician(
    @Param('id')
    id: string,

    @Body()
    dto: AssignTechnicianDto,
  ) {
    return this.repairsService.assignTechnician(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission({ action: 'update', resource: 'repairs' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRepairStatusDto,
    @Req() req: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.repairsService.changeStatus(
      id,
      dto.status,
      req.user,
      req.matchedPermission,
      dto.reason,
      image,
    );
  }
}
