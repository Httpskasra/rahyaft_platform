import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../dto/warehouse.dto';
import { WarehouseAccessService } from './warehouse-access.service';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService, private readonly wa: WarehouseAccessService) {}

  /**
   * Structure rule: exactly ONE general warehouse (root, no parent) which contains sub-warehouses.
   * Only two levels exist; stock and all operations live in the sub-warehouses.
   */
  private async validateStructure(dto: { parentId?: string; keeperId?: string }, existing?: { id: string; parentId: string | null }) {
    const isRoot = existing ? existing.parentId === null : !dto.parentId;
    if (isRoot) {
      if (dto.parentId) throw new BadRequestException('انبار کلی نمی‌تواند زیرمجموعه انبار دیگری باشد');
      if (dto.keeperId) throw new BadRequestException('انباردار فقط برای زیرانبار تعریف می‌شود');
      if (!existing) {
        const root = await this.prisma.warehouse.findFirst({ where: { parentId: null } });
        if (root) throw new ConflictException(`انبار کلی («${root.name}») قبلاً تعریف شده است؛ برای ساخت انبار جدید، زیرانبار بسازید (parentId = انبار کلی)`);
      }
      return;
    }
    if (dto.parentId) {
      const parent = await this.prisma.warehouse.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('انبار کلی یافت نشد');
      if (parent.parentId !== null) throw new BadRequestException('زیرانبار فقط می‌تواند زیرمجموعه انبار کلی باشد (دو سطح بیشتر نداریم)');
    }
  }

  private async validate(dto: { parentId?: string; keeperId?: string; number?: string }, selfId?: string) {
    if (dto.number) {
      const dup = await this.prisma.warehouse.findFirst({ where: { number: dto.number, ...(selfId ? { id: { not: selfId } } : {}) } });
      if (dup) throw new ConflictException(`شماره ${dto.number} قبلاً برای «${dup.name}» ثبت شده است`);
    }
    if (dto.keeperId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.keeperId } });
      if (!u) throw new NotFoundException('انباردار یافت نشد');
    }
  }

  async create(dto: CreateWarehouseDto) {
    await this.validateStructure(dto);
    await this.validate(dto);
    return this.prisma.warehouse.create({ data: dto, include: { keeper: { select: { id: true, name: true } } } });
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const existing = await this.mustGet(id);
    await this.validateStructure(dto, existing);
    await this.validate(dto, id);
    return this.prisma.warehouse.update({ where: { id }, data: dto, include: { keeper: { select: { id: true, name: true } } } });
  }

  private async mustGet(id: string) {
    const w = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('انبار یافت نشد');
    return w;
  }

  /** Flat list — every keeper needs to see all warehouses (e.g. to pick a transfer source). */
  async list(includeInactive = false) {
    const [rows, locked] = await Promise.all([
      this.prisma.warehouse.findMany({
        where: includeInactive ? {} : { isActive: true }, orderBy: { number: 'asc' },
        include: { keeper: { select: { id: true, name: true } }, _count: { select: { children: true } } },
      }),
      this.wa.lockedIds(),
    ]);
    return rows.map((w) => ({ ...w, isLocked: locked.includes(w.id) }));
  }

  async tree() {
    const flat = await this.list();
    const byId = new Map<string, any>(flat.map((w) => [w.id, { ...w, children: [] as any[] }]));
    const roots: any[] = [];
    for (const w of byId.values()) {
      if (w.parentId && byId.has(w.parentId)) byId.get(w.parentId).children.push(w);
      else roots.push(w);
    }
    return roots;
  }

  async mine(user: AuthenticatedUser) {
    const all = await this.list();
    return all.filter((w) => w.keeperId === user.id);
  }

  async get(id: string) {
    const w = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { keeper: { select: { id: true, name: true } }, parent: { select: { id: true, name: true, number: true } }, children: { select: { id: true, name: true, number: true } } },
    });
    if (!w) throw new NotFoundException('انبار یافت نشد');
    return w;
  }

  async remove(id: string) {
    await this.mustGet(id);
    const [children, stock, history] = await Promise.all([
      this.prisma.warehouse.count({ where: { parentId: id } }),
      this.prisma.stockItem.count({ where: { warehouseId: id, quantity: { gt: 0 } } }),
      this.prisma.warehouseInvoice.count({ where: { OR: [{ warehouseId: id }, { counterWarehouseId: id }] } }),
    ]);
    if (stock > 0) throw new ConflictException('انبار دارای موجودی است و قابل حذف نیست');
    if (children > 0) throw new ConflictException('ابتدا زیرانبارهای این انبار را حذف یا جابه‌جا کنید');
    if (history > 0) {
      await this.prisma.warehouse.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true, message: 'انبار سابقه عملیات دارد و غیرفعال شد' };
    }
    await this.prisma.warehouse.delete({ where: { id } });
    return { deleted: true };
  }

  async assertCanView(user: AuthenticatedUser, warehouseId: string) {
    if (this.wa.isManager(user)) return;
    const w = await this.mustGet(warehouseId);
    if (w.keeperId !== user.id) throw new ForbiddenException('دسترسی به این انبار مجاز نیست');
  }
}
