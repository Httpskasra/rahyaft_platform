import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';

import { RepairsService } from './repairs.service';

import { CreateRepairDto } from './dto/create-repair.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { UpdateRepairStatusDto } from './dto/update-repair-status.dto';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

@ApiTags('Repairs')
@ApiBearerAuth('access-token')
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'repairs' })
  create(
    @Body()
    dto: CreateRepairDto,
  ) {
    return this.repairsService.create(dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'repairs' })
  findAll(@Req() req: any) {
    return this.repairsService.findAll(req.user, req.matchedPermission);
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

  @Patch(':id/assign')
  @RequirePermission({ action: 'update', resource: 'repairs' })
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
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRepairStatusDto,
    @Req() req: any,
  ) {
    return this.repairsService.changeStatus(
      id,
      dto.status,
      req.user,
      req.matchedPermission,
      dto.reason,
    );
  }
}
