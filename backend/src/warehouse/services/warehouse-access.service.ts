import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../../common/shared/access.service';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';

@Injectable()
export class WarehouseAccessService {
  constructor(private readonly prisma: PrismaService, private readonly access: AccessService) {}

  /** «مدیر انبارها» = anyone holding warehouses:manage */
  isManager(user: AuthenticatedUser) {
    return this.access.hasPermission(user, 'warehouses', 'manage');
  }

  async keptIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.warehouse.findMany({ where: { keeperId: userId, isActive: true }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /** null = unrestricted (manager); otherwise the warehouses the user keeps. */
  async visibleIds(user: AuthenticatedUser): Promise<string[] | null> {
    return this.isManager(user) ? null : this.keptIds(user.id);
  }

  async assertKeeperOrManager(user: AuthenticatedUser, warehouseId: string) {
    const w = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!w) throw new NotFoundException('انبار یافت نشد');
    if (!w.isActive) throw new ConflictException('انبار غیرفعال است');
    if (this.isManager(user) || w.keeperId === user.id) return w;
    throw new ForbiddenException('شما مسئول این انبار نیستید');
  }

  async lockedIds(): Promise<string[]> {
    const rows = await this.prisma.stocktakeWarehouse.findMany({
      where: { stocktake: { status: 'COUNTING' } }, select: { warehouseId: true },
    });
    return rows.map((r) => r.warehouseId);
  }

  /** Stock-changing operations are paused for warehouses that are part of an active stocktake. */
  async assertUnlocked(warehouseIds: string[], client: any = this.prisma) {
    if (!warehouseIds.length) return;
    const hit = await client.stocktakeWarehouse.findFirst({
      where: { warehouseId: { in: warehouseIds }, stocktake: { status: 'COUNTING' } },
      include: { warehouse: { select: { name: true } } },
    });
    if (hit) throw new ConflictException(`انبار «${hit.warehouse.name}» در حال انبارگردانی است و عملیات انبار موقتاً متوقف است`);
  }

  /** Stock operations are only allowed on sub-warehouses, never on the general (root) warehouse. */
  async assertSubWarehouses(warehouseIds: string[], client: any = this.prisma) {
    const root = await client.warehouse.findFirst({ where: { id: { in: warehouseIds }, parentId: null }, select: { name: true } });
    if (root) throw new ConflictException(`«${root.name}» انبار کلی است؛ این عملیات باید روی یکی از زیرانبارها انجام شود`);
  }

  async descendantIds(ids: string[]): Promise<string[]> {
    const all = await this.prisma.warehouse.findMany({ select: { id: true, parentId: true } });
    const result = new Set(ids);
    let grew = true;
    while (grew) {
      grew = false;
      for (const w of all) {
        if (w.parentId && result.has(w.parentId) && !result.has(w.id)) {
          result.add(w.id);
          grew = true;
        }
      }
    }
    return [...result];
  }
}
