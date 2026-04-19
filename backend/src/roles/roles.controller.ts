import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AddPermissionDto } from './dto/add-permission.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UpdateRoleDto } from './dto/updtade-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermission({ action: 'create', resource: 'roles' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'delete', resource: 'roles' })
  remove(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.rolesService.remove(roleId);
  }
  @Patch(':roleId')
  @RequirePermission({ action: 'delete', resource: 'roles' })
  update(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(roleId, dto);
  }
  /** POST /roles/:roleId/permissions — add a permission (with scope) to a role */
  @Post(':roleId/permissions')
  @RequirePermission({ action: 'update', resource: 'roles' })
  addPermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: AddPermissionDto,
  ) {
    return this.rolesService.addPermission(roleId, dto);
  }

  /** POST /roles/assign — assign a role to a user */
  @Post('assign')
  @RequirePermission({ action: 'update', resource: 'roles' })
  assignToUser(@Body() dto: AssignRoleDto) {
    return this.rolesService.assignToUser(dto);
  }

  /** DELETE /roles/assign — remove a role from a user */
  @Delete('assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'update', resource: 'roles' })
  removeFromUser(@Body() dto: AssignRoleDto) {
    return this.rolesService.removeFromUser(dto);
  }
}
