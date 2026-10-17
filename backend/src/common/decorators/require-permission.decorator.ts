import { SetMetadata } from '@nestjs/common';
import { ScopeType } from 'src/generated/prisma/enums.js';
import { PERMISSION_CATALOG, type PermissionResource } from '../permissions/permission-catalog';

export const PERMISSION_KEY = 'required_permission';

export type RequiredPermission = {
  [R in PermissionResource]: {
    action: (typeof PERMISSION_CATALOG)[R][number];
    resource: R;
    scope?: ScopeType;
  }
}[PermissionResource];

/**
 * Marks a route with the exact permission required to access it.
 * Action/resource combinations are compile-time checked against PERMISSION_CATALOG.
 */
export const RequirePermission = (permission: RequiredPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
