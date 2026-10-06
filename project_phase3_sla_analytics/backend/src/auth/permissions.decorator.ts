// src/auth/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { ScopeType } from '../generated/prisma/enums';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionMetadata {
  action: string;
  resource: string;
  scope?: ScopeType;
}

export const Permissions = (metadata: PermissionMetadata) =>
  SetMetadata(PERMISSIONS_KEY, metadata);
