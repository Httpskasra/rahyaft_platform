import { Controller, Get, Post, Patch, Delete, Body } from '@nestjs/common';
import { UserInfoService } from './user-info.service';
import { CreateUserInfoDto } from './dto/create-user-info.dto';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('user-info')
export class UserInfoController {
  constructor(private readonly userInfoService: UserInfoService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'user-info' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserInfoDto,
  ) {
    return this.userInfoService.create(user.id, dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'user-info' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.userInfoService.findMine(user.id);
  }

  @Patch()
  @RequirePermission({ action: 'update', resource: 'user-info' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserInfoDto,
  ) {
    return this.userInfoService.update(user.id, dto);
  }

  @Delete()
  @RequirePermission({ action: 'delete', resource: 'user-info' })
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.userInfoService.remove(user.id);
  }
}
