/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/auth/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY, PermissionMetadata } from './permissions.decorator';
import { RedisService } from '../redis/redis.service';

interface JwtUser {
  id: string;
  departmentId: string;
  [key: string]: any;
}
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<PermissionMetadata>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      // مسیر بدون Decorator → اجازه
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // فرض می‌کنیم JWT decoded user

    // Step 1: گرفتن Role و Permission کاربر
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    // Step 2: محاسبه allowed scopes
    const allowedDepartments = await this.getAllowedDepartments(
      user,
      requiredPermission.scope,
    );

    // Step 3: بررسی اجازه
    if (!allowedDepartments || allowedDepartments.length === 0) {
      throw new ForbiddenException('Access Denied');
    }

    // بعداً می‌توان محدودیت‌های ABAC را هم اضافه کرد
    return true;
  }

  private async getAllowedDepartments(
    user: any,
    scope?: string,
  ): Promise<string[]> {
    if (!scope) return [];

    const cacheKey = `allowed_depts:${user.id}:${scope}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let departments: string[] = [];

    switch (scope) {
      case 'SELF':
        departments = [user.departmentId];
        break;
      case 'DEPARTMENT':
        departments = [user.departmentId];
        break;
      case 'DEPARTMENT_SUBTREE':
        departments = await this.getSubtreeDepartments(user.departmentId);
        break;
      case 'RELATED_DEPARTMENTS':
        departments = await this.getRelatedDepartments(user.departmentId);
        break;
      case 'ORG_WIDE':
        const all = await this.prisma.department.findMany({
          select: { id: true },
        });
        departments = all.map((d) => d.id);
        break;
      default:
        departments = [user.departmentId];
    }

    await this.redis.set(cacheKey, JSON.stringify(departments), 60 * 10); // 10 min TTL
    return departments;
  }

  private async getSubtreeDepartments(departmentId: string): Promise<string[]> {
    // بازگشت دپارتمان خود و همه زیرشاخه‌ها
    const result: string[] = [departmentId];

    const queue = [departmentId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await this.prisma.department.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      children.forEach((c) => {
        result.push(c.id);
        queue.push(c.id);
      });
    }

    return result;
  }

  private async getRelatedDepartments(departmentId: string): Promise<string[]> {
    const relations = await this.prisma.departmentRelation.findMany({
      where: { fromDepartmentId: departmentId },
      select: { toDepartmentId: true },
    });
    return relations.map((r) => r.toDepartmentId);
  }
}
