/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUser } from '../interfaces/auth.interface';

import { PrismaService } from '../../prisma/prisma.service';

import {
  RequiredPermission,
  PERMISSION_KEY,
} from '../decorators/require-permission.decorator';
import { DepartmentRelationType, ScopeType } from 'src/generated/prisma/enums';


/**
 * PermissionGuard
 *
 * Handles the complex RBAC logic based on this schema.
 *
 * Flow:
 * 1. Read the @RequirePermission() metadata from the route
 * 2. Get the authenticated user (already attached by JwtAuthGuard)
 * 3. Check if any of the user's roles has this permission
 * 4. Evaluate the SCOPE of the permission to decide if access is granted
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permission from route metadata
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @RequirePermission() decorator, allow access (just needs valid JWT)
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) throw new ForbiddenException('User not authenticated');

    // 2. Find a matching permission across all user roles
    const matchedPermission = this.findMatchingPermission(user, required);

    if (!matchedPermission) {
      throw new ForbiddenException(
        `Missing permission: ${required.action}:${required.resource}`,
      );
    }

    // 3. Evaluate the scope
    const targetUserId: string | undefined = request.params?.userId;
    const allowed = await this.evaluateScope(
      user,
      matchedPermission,
      targetUserId,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission denied: scope '${matchedPermission.scope}' does not cover this resource`,
      );
    }

    // 4. Attach matched permission to request for downstream use
    request.matchedPermission = matchedPermission;
    return true;
  }

  /**
   * Find the first matching permission in the user's roles
   */
  private findMatchingPermission(
    user: AuthenticatedUser,
    required: RequiredPermission,
  ) {
    for (const role of user.roles) {
      for (const perm of role.permissions) {
        if (
          perm.action === required.action &&
          perm.resource === required.resource
        ) {
          // If a specific scope is required, check it matches
          if (required.scope && perm.scope !== required.scope) continue;
          return perm;
        }
      }
    }
    return null;
  }

  /**
   * Evaluate if the permission scope covers the requested resource.
   *
   * This is where the schema's ScopeType enum comes to life:
   *
   * SELF              → only the user themselves
   * TEAM              → user's direct subordinates
   * DEPARTMENT        → users in the same department
   * DEPARTMENT_SUBTREE→ department + all child departments
   * RELATED_DEPARTMENTS→ departments linked via DepartmentRelation
   * ORG_WIDE          → everyone
   */
  private async evaluateScope(
    user: AuthenticatedUser,
    permission: AuthenticatedUser['roles'][0]['permissions'][0],
    targetUserId?: string,
  ): Promise<boolean> {
    const scope = permission.scope;

    // If no target user, just having the permission is enough (e.g. listing)
    if (!targetUserId) return true;

    // ORG_WIDE: no restrictions
    if (scope === ScopeType.ORG_WIDE) return true;

    // SELF: can only act on themselves
    if (scope === ScopeType.SELF) return user.id === targetUserId;

    // Fetch target user to compare
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, departmentId: true, managerId: true },
    });

    if (!targetUser) return false;

    // TEAM: target must be a direct subordinate
    if (scope === ScopeType.TEAM) {
      return targetUser.managerId === user.id;
    }

    // DEPARTMENT: same department
    if (scope === ScopeType.DEPARTMENT) {
      return targetUser.departmentId === user.departmentId;
    }

    // DEPARTMENT_SUBTREE: same department or any child department
    if (scope === ScopeType.DEPARTMENT_SUBTREE) {
      const subtreeIds = await this.getDepartmentSubtree(user.departmentId);
      return subtreeIds.has(targetUser.departmentId);
    }

    // RELATED_DEPARTMENTS: departments with specific relation type
    if (scope === ScopeType.RELATED_DEPARTMENTS) {
      const relatedIds = await this.getRelatedDepartments(
        user.departmentId,
        permission.relationType as DepartmentRelationType,
      );
      return relatedIds.has(targetUser.departmentId);
    }

    return false;
  }

  /**
   * Recursively get all department IDs in the subtree (department + all children)
   */
  private async getDepartmentSubtree(
    departmentId: string,
  ): Promise<Set<string>> {
    const ids = new Set<string>();
    const queue = [departmentId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      ids.add(current);

      const children = await this.prisma.department.findMany({
        where: { parentId: current },
        select: { id: true },
      });

      children.forEach((c) => {
        if (!ids.has(c.id)) queue.push(c.id);
      });
    }

    return ids;
  }

  /**
   * Get related department IDs via DepartmentRelation table
   * e.g. if the user's dept AUDITS other depts, return those dept IDs
   */
  private async getRelatedDepartments(
    departmentId: string,
    relationType?: DepartmentRelationType | null,
  ): Promise<Set<string>> {
    const where: any = { fromDepartmentId: departmentId };
    if (relationType) where.type = relationType;

    const relations = await this.prisma.departmentRelation.findMany({
      where,
      select: { toDepartmentId: true },
    });

    return new Set(relations.map((r) => r.toDepartmentId));
  }
}
