import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateDepartmentRelationDto } from './dto/create-department-relation.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'departments' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':departmentId')
  @RequirePermission({ action: 'read', resource: 'departments' })
  findOne(@Param('departmentId', ParseUUIDPipe) departmentId: string) {
    return this.departmentsService.findOne(departmentId);
  }

  @Post()
  @RequirePermission({ action: 'create', resource: 'departments' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':departmentId')
  @RequirePermission({ action: 'update', resource: 'departments' })
  update(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(departmentId, dto);
  }

  @Delete(':departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'delete', resource: 'departments' })
  remove(@Param('departmentId', ParseUUIDPipe) departmentId: string) {
    return this.departmentsService.remove(departmentId);
  }

  /** POST /departments/relations — create a typed relation between two departments */
  @Post('relations')
  @RequirePermission({ action: 'update', resource: 'departments' })
  createRelation(@Body() dto: CreateDepartmentRelationDto) {
    return this.departmentsService.createRelation(dto);
  }

  /** DELETE /departments/relations/:relationId */
  @Delete('relations/:relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'update', resource: 'departments' })
  removeRelation(@Param('relationId', ParseUUIDPipe) relationId: string) {
    return this.departmentsService.removeRelation(relationId);
  }
}
