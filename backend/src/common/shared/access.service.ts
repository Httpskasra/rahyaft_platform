import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/auth.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  hasPermission(user: AuthenticatedUser, resource: string, action: string): boolean {
    return (user?.roles ?? []).some((role) =>
      role.permissions.some((p) => p.resource === resource && p.action === action),
    );
  }

  async userIdsWithPermission(resource: string, action: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { role: { permissions: { some: { permission: { resource, action } } } } },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async userNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean) as string[])];
    if (!unique.length) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
