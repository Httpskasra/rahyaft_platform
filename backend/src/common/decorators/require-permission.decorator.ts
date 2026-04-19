import { SetMetadata } from '@nestjs/common';
import { ScopeType } from 'src/generated/prisma/enums.js';

export const PERMISSION_KEY = 'required_permission';
export interface RequiredPermission {
  action: string;
  resource: string;
  scope?: ScopeType;
}

/**
 * @RequirePermission() decorator
 * Marks a route with the permission needed to access it.
 *
 * Usage:
 *   @RequirePermission({ action: 'read', resource: 'reports' })
 *   @RequirePermission({ action: 'write', resource: 'users', scope: ScopeType.DEPARTMENT })
 */
export const RequirePermission = (permission: RequiredPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
