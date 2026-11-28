import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_PERMISSIONS } from '../common/permissions/permission-catalog';

/**
 * The «superadmin» role cannot be edited from the roles page and the permission guard has no bypass,
 * so on every start we make sure it holds every permission of the catalog (idempotent, cheap).
 * Every OTHER role (مدیر بازرگانی، مسئول خرید، مدیر انبارها، انباردار …) is created by the superadmin in the UI.
 * Disable with COMMERCE_AUTO_SEED=false.
 */
@Injectable()
export class CommerceBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CommerceBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (process.env.COMMERCE_AUTO_SEED === 'false') return;
    try {
      await this.syncSuperadmin();
    } catch (e) {
      this.logger.error(`Superadmin permission sync failed (continuing): ${(e as Error).message}`);
    }
  }

  async syncSuperadmin() {
    const superadmin = await this.prisma.role.findUnique({ where: { name: 'superadmin' } });
    if (!superadmin) return;

    const ids: string[] = [];
    for (const { action, resource } of ALL_PERMISSIONS) {
      const p = await this.prisma.permission.upsert({ where: { action_resource: { action, resource } }, update: {}, create: { action, resource } });
      ids.push(p.id);
    }
    const have = new Set((await this.prisma.rolePermission.findMany({ where: { roleId: superadmin.id }, select: { permissionId: true } })).map((r) => r.permissionId));
    const missing = ids.filter((id) => !have.has(id));
    if (missing.length) {
      await this.prisma.rolePermission.createMany({
        data: missing.map((permissionId) => ({ roleId: superadmin.id, permissionId, scope: 'ORG_WIDE' as const })),
        skipDuplicates: true,
      });
      this.logger.log(`superadmin: ${missing.length} new permission(s) granted`);
    }
  }
}
