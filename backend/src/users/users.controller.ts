// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */

// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unsafe-call */

// /* eslint-disable no-case-declarations */
// import { Body, Controller, Get, Param, Patch } from '@nestjs/common';

// import { RequirePermission } from '../common/decorators/require-permission.decorator';
// import { CurrentUser } from '../common/decorators/current-user.decorator';
// import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
// import { PrismaService } from '../prisma/prisma.service';
// import { ScopeType } from 'src/generated/prisma/enums';

// /**
//  * UsersController
//  *
//  * This is an EXAMPLE controller showing how auth + RBAC work together.
//  *
//  * The JwtAuthGuard (global) ensures the user is authenticated.
//  * The PermissionGuard checks the @RequirePermission() decorator.
//  * The @CurrentUser() decorator injects the full user object.
//  */
// @Controller('users')
// export class UsersController {
//   constructor(private readonly prisma: PrismaService) {}

//   /**
//    * GET /users
//    * Requires: read:users with any scope
//    * Example: a manager can list their department's users
//    */
//   @Get()
//   @RequirePermission({ action: 'read', resource: 'users' })
//   async findAll(@CurrentUser() user: AuthenticatedUser) {
//     // The scope is already validated by PermissionGuard.
//     // Here we apply the scope in the query itself for data filtering.
//     const userPermission = this.extractPermission(user, 'read', 'users');
//     const scope = userPermission?.scope as ScopeType;

//     return this.getUsersByScope(user, scope);
//   }

//   /**
//    * GET /users/:userId
//    * Requires: read:users
//    * PermissionGuard will check if the requesting user's scope covers :userId
//    */
//   @Get(':userId')
//   @RequirePermission({ action: 'read', resource: 'users' })
//   async findOne(
//     @Param('userId') userId: string,
//     @CurrentUser() user: AuthenticatedUser,
//   ) {
//     return this.prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         departmentId: true,
//         department: { select: { name: true } },
//         roles: { select: { role: { select: { name: true } } } },
//       },
//     });
//   }

//   /**
//    * PATCH /users/:userId/roles
//    * Requires: write:roles — only managers or admins
//    */
//   @Patch(':userId/roles')
//   @RequirePermission({
//     action: 'write',
//     resource: 'roles',
//     scope: ScopeType.DEPARTMENT,
//   })
//   async assignRole(
//     @Param('userId') userId: string,
//     @Body() body: { roleId: string },
//     @CurrentUser() user: AuthenticatedUser,
//   ) {
//     return this.prisma.userRole.upsert({
//       where: { userId_roleId: { userId, roleId: body.roleId } },
//       update: {},
//       create: { userId, roleId: body.roleId },
//     });
//   }

//   // ─────────────────────────────────────────────
//   // Helpers
//   // ─────────────────────────────────────────────

//   private extractPermission(
//     user: AuthenticatedUser,
//     action: string,
//     resource: string,
//   ) {
//     for (const role of user.roles) {
//       const perm = role.permissions.find(
//         (p) => p.action === action && p.resource === resource,
//       );
//       if (perm) return perm;
//     }
//     return null;
//   }

//   private async getUsersByScope(user: AuthenticatedUser, scope: ScopeType) {
//     switch (scope) {
//       case ScopeType.SELF:
//         return this.prisma.user.findMany({ where: { id: user.id } });

//       case ScopeType.TEAM:
//         return this.prisma.user.findMany({ where: { managerId: user.id } });

//       case ScopeType.DEPARTMENT:
//         return this.prisma.user.findMany({
//           where: { departmentId: user.departmentId },
//         });

//       case ScopeType.DEPARTMENT_SUBTREE:
//         // Get all departments in subtree, then query users
//         const subtreeIds = await this.getDepartmentSubtreeIds(
//           user.departmentId,
//         );
//         return this.prisma.user.findMany({
//           where: { departmentId: { in: subtreeIds } },
//         });

//       case ScopeType.ORG_WIDE:
//         return this.prisma.user.findMany();

//       default:
//         return [];
//     }
//   }

//   private async getDepartmentSubtreeIds(
//     departmentId: string,
//   ): Promise<string[]> {
//     const ids: string[] = [];
//     const queue = [departmentId];

//     while (queue.length > 0) {
//       const current = queue.shift()!;
//       ids.push(current);
//       const children = await this.prisma.department.findMany({
//         where: { parentId: current },
//         select: { id: true },
//       });
//       children.forEach((c) => queue.push(c.id));
//     }

//     return ids;
//   }
// }
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
}
