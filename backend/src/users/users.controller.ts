import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from 'src/common/interfaces/auth.interface';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users — list all (scope enforced by PermissionGuard) */
  @Get()
  @RequirePermission({ action: 'read', resource: 'users' })
  findAll() {
    return this.usersService.findAll();
  }

  /** GET /users/:userId */
  @Get(':userId')
  @RequirePermission({ action: 'read', resource: 'users' })
  findOne(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.findOne(userId);
  }

  /**
   * POST /users
   * Admin-only: create a user by phone number.
   * Requires permission: create:users
   */
  @Post()
  @RequirePermission({ action: 'create', resource: 'users' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /** PATCH /users/:userId */
  @Patch(':userId')
  @RequirePermission({ action: 'update', resource: 'users' })
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  /** DELETE /users/:userId */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: 'delete', resource: 'users' })
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.remove(userId, user);
  }

  /** DELETE /users/:userId/bale-chat */
  @Delete(':userId/bale-chat')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: 'update', resource: 'users' })
  resetBaleChat(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.resetBaleChat(userId);
  }
}
