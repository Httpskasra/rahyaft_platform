import { Controller, Get, Post, Put, Delete, Body } from '@nestjs/common';
import { UserInfoService } from './user-info.service';
import { CreateUserInfoDto } from './dto/create-user-info.dto';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';

@Controller('user-info')
export class UserInfoController {
  constructor(private readonly userInfoService: UserInfoService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserInfoDto,
  ) {
    return this.userInfoService.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.userInfoService.findMine(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserInfoDto,
  ) {
    return this.userInfoService.update(user.id, dto);
  }

  @Delete()
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.userInfoService.remove(user.id);
  }
}