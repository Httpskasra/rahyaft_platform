import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../../common/shared/access.service';
import { SequenceService } from '../../common/shared/sequence.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { StocktakeStatus, StocktakeWarehouseStatus, WarehouseInvoiceType } from '../../generated/prisma/enums';
import { CreateStocktakeDto, QueryStocktakesDto, SaveCountsDto } from '../dto/warehouse.dto';
import { ci, dateRange, orderByOf, pageArgs, paged, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import { InvoicesService } from './invoices.service';
import { StockService } from './stock.service';
import { WarehouseAccessService } from './warehouse-access.service';

type LineState = 'UNCOUNTED' | 'MATCH' | 'SHORTAGE' | 'SURPLUS';

export function shapeLine(l: { productId: string; systemQuantity: number; countedQuantity: number | null; product?: any }) {
  const difference = l.countedQuantity === null ? null : l.countedQuantity - l.systemQuantity;
  const state: LineState = difference === null ? 'UNCOUNTED' : difference === 0 ? 'MATCH' : difference < 0 ? 'SHORTAGE' : 'SURPLUS';
  // UI colors: MATCH → white, SHORTAGE → red, SURPLUS → green
  return { productId: l.productId, product: l.product, systemQuantity: l.systemQuantity, countedQuantity: l.countedQuantity, difference, state };
}

@Injectable()
export class StocktakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly wa: WarehouseAccessService,
    private readonly stock: StockService,
    private readonly invoices: InvoicesService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateStocktakeDto, user: AuthenticatedUser) {
    const active = await this.prisma.stocktake.findFirst({ where: { status: StocktakeStatus.COUNTING } });
    if (active) throw new ConflictException(`انبارگردانی ${active.number} هنوز در جریان است`);
    const warehouses = await this.prisma.warehouse.findMany({ where: { isActive: true, parentId: { not: null }, ...(dto.warehouseIds?.length ? { id: { in: dto.warehouseIds } } : {}) } });
    if (!warehouses.length || (dto.warehouseIds && warehouses.length !== new Set(dto.warehouseIds).size)) {
      throw new BadRequestException('انبارهای انتخابی نامعتبر است');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const number = await this.sequence.next('ST', tx);
      const st = await tx.stocktake.create({ data: { number, notes: dto.notes, startedById: user.id } });
      for (const w of warehouses) {
        const grouped = await tx.stockItem.groupBy({ by: ['productId'], where: { warehouseId: w.id, quantity: { gt: 0 } }, _sum: { quantity: true } });
        await tx.stocktakeWarehouse.create({
          data: { stocktakeId: st.id, warehouseId: w.id, lines: { create: grouped.map((g) => ({ productId: g.productId, systemQuantity: g._sum.quantity ?? 0 })) } },
        });
      }
      return st;
    });
    await this.notifications.notifyUsers(warehouses.map((w) => w.keeperId).filter(Boolean) as string[], {
      type: 'STOCKTAKE_STARTED', category: 'WAREHOUSE', title: 'انبارگردانی آغاز شد',
      body: `انبارگردانی ${created.number} شروع شد؛ موجودی قفل است. لطفاً شمارش فیزیکی را ثبت کنید.`,
      entityType: 'Stocktake', entityId: created.id, actorId: user.id,
    });
    return this.get(created.id, user);
  }

  async list(q: QueryStocktakesDto = {}) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (q.status) conditions.push({ status: q.status });
    const range = dateRange('startedAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { number: ci(t) }, { notes: ci(t) },
        { warehouses: { some: { warehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { startedAt: (d) => ({ startedAt: d }), number: (d) => ({ number: d }), status: (d) => ({ status: d }) }, [{ startedAt: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stocktake.findMany({ where, skip, take, orderBy, include: { _count: { select: { warehouses: true } } } }),
      this.prisma.stocktake.count({ where }),
    ]);
    return paged(items, total, q);
  }


  private async sheetsOf(stocktakeId: string, user: AuthenticatedUser, q?: string) {
    const seeAll = this.wa.isManager(user) || this.access.hasPermission(user, 'stocktakes', 'manage');
    const visible = seeAll ? null : await this.wa.keptIds(user.id);
    const term = q?.trim().toLowerCase();
    const sheets = await this.prisma.stocktakeWarehouse.findMany({
      where: { stocktakeId, ...(visible ? { warehouseId: { in: visible } } : {}) },
      include: {
        warehouse: { select: { id: true, name: true, number: true, keeperId: true } },
        lines: { include: { product: { select: { id: true, code: true, fullName: true } } } },
      },
      orderBy: { warehouse: { number: 'asc' } },
    });
    return sheets.map((s) => ({
      id: s.id, warehouse: s.warehouse, status: s.status, returnNote: s.returnNote, submittedAt: s.submittedAt,
      lines: s.lines
        .filter((l) => !term || l.product.fullName.toLowerCase().includes(term) || l.product.code.includes(term))
        .map(shapeLine).sort((a, b) => a.product.code.localeCompare(b.product.code)),
    }));
  }

  async get(id: string, user: AuthenticatedUser, q?: string) {
    const st = await this.prisma.stocktake.findUnique({ where: { id } });
    if (!st) throw new NotFoundException('انبارگردانی یافت نشد');
    return { ...st, sheets: await this.sheetsOf(id, user, q) };
  }

  /** The keeper's own sheets in the currently active stocktake. */
  async mine(user: AuthenticatedUser) {
    const st = await this.prisma.stocktake.findFirst({ where: { status: StocktakeStatus.COUNTING } });
    if (!st) return null;
    const keeperOnly = { ...user, roles: [] } as AuthenticatedUser; // force keeper-scoped view
    return { ...st, sheets: await this.sheetsOf(st.id, keeperOnly) };
  }

  private async mustSheet(stocktakeId: string, warehouseId: string) {
    const st = await this.prisma.stocktake.findUnique({ where: { id: stocktakeId } });
    if (!st) throw new NotFoundException('انبارگردانی یافت نشد');
    if (st.status !== StocktakeStatus.COUNTING) throw new ConflictException('این انبارگردانی بسته شده است');
    const sheet = await this.prisma.stocktakeWarehouse.findUnique({ where: { stocktakeId_warehouseId: { stocktakeId, warehouseId } }, include: { lines: true, warehouse: true } });
    if (!sheet) throw new NotFoundException('این انبار در انبارگردانی شرکت ندارد');
    return { st, sheet };
  }

  /** «ثبت موقت» — can be called repeatedly. */
  async saveCounts(stocktakeId: string, warehouseId: string, dto: SaveCountsDto, user: AuthenticatedUser) {
    await this.wa.assertKeeperOrManager(user, warehouseId);
    const { sheet } = await this.mustSheet(stocktakeId, warehouseId);
    if (sheet.status === StocktakeWarehouseStatus.SUBMITTED) throw new ConflictException('شمارش ارسال شده است؛ برای اصلاح باید توسط مدیر برگشت داده شود');

    await this.prisma.$transaction(async (tx) => {
      for (const c of dto.counts) {
        const value = c.countedQuantity ?? null;
        const line = sheet.lines.find((l) => l.productId === c.productId);
        if (line) {
          await tx.stocktakeLine.update({ where: { id: line.id }, data: { countedQuantity: value } });
        } else if (value !== null) {
          const product = await tx.product.findUnique({ where: { id: c.productId } });
          if (!product) throw new BadRequestException('محصول نامعتبر است');
          await tx.stocktakeLine.create({ data: { stocktakeWarehouseId: sheet.id, productId: c.productId, systemQuantity: await this.stock.onHand(tx, warehouseId, c.productId), countedQuantity: value } });
        }
      }
      await tx.stocktakeWarehouse.update({ where: { id: sheet.id }, data: { status: StocktakeWarehouseStatus.COUNTING } });
    });
    return this.sheetResult(stocktakeId, warehouseId, user);
  }

  /** «ثبت موقت نهایی» توسط مسئول انبار → ارسال برای مدیر انبارها. */
  async submit(stocktakeId: string, warehouseId: string, user: AuthenticatedUser) {
    await this.wa.assertKeeperOrManager(user, warehouseId);
    const { st, sheet } = await this.mustSheet(stocktakeId, warehouseId);
    if (sheet.status === StocktakeWarehouseStatus.SUBMITTED) throw new ConflictException('قبلاً ارسال شده است');
    const uncounted = sheet.lines.filter((l) => l.countedQuantity === null).length;
    if (uncounted) throw new BadRequestException(`${uncounted} ردیف هنوز شمارش نشده است`);
    await this.prisma.stocktakeWarehouse.update({ where: { id: sheet.id }, data: { status: StocktakeWarehouseStatus.SUBMITTED, submittedAt: new Date(), returnNote: null } });
    const managers = await this.access.userIdsWithPermission('stocktakes', 'manage');
    await this.notifications.notifyUsers(managers, {
      type: 'STOCKTAKE_SUBMITTED', category: 'WAREHOUSE', title: 'شمارش انبار ارسال شد',
      body: `شمارش انبار «${sheet.warehouse.name}» در ${st.number} برای بررسی ارسال شد.`, entityType: 'Stocktake', entityId: stocktakeId, actorId: user.id,
    });
    return this.sheetResult(stocktakeId, warehouseId, user);
  }

  /** Manager returns one warehouse's sheet to its keeper for correction. */
  async returnSheet(stocktakeId: string, warehouseId: string, note: string | undefined, user: AuthenticatedUser) {
    const { st, sheet } = await this.mustSheet(stocktakeId, warehouseId);
    if (sheet.status !== StocktakeWarehouseStatus.SUBMITTED) throw new ConflictException('فقط شمارش ارسال‌شده قابل برگشت است');
    await this.prisma.stocktakeWarehouse.update({ where: { id: sheet.id }, data: { status: StocktakeWarehouseStatus.RETURNED, returnNote: note } });
    await this.notifications.notifyUsers([sheet.warehouse.keeperId].filter(Boolean) as string[], {
      type: 'STOCKTAKE_RETURNED', category: 'WAREHOUSE', title: 'شمارش برای اصلاح برگشت داده شد',
      body: `شمارش انبار «${sheet.warehouse.name}» در ${st.number} نیاز به اصلاح دارد${note ? `: ${note}` : ''}`, entityType: 'Stocktake', entityId: stocktakeId, actorId: user.id,
    });
    return this.sheetResult(stocktakeId, warehouseId, user);
  }

  private async sheetResult(stocktakeId: string, warehouseId: string, user: AuthenticatedUser) {
    const sheets = await this.sheetsOf(stocktakeId, user);
    return sheets.find((s) => s.warehouse.id === warehouseId);
  }

  /** «ثبت نهایی» — applies the counted quantities, issues adjustment documents and unlocks the warehouses. */
  async finalize(stocktakeId: string, user: AuthenticatedUser) {
    const st = await this.prisma.stocktake.findUnique({ where: { id: stocktakeId }, include: { warehouses: { include: { lines: true } } } });
    if (!st) throw new NotFoundException('انبارگردانی یافت نشد');
    if (st.status !== StocktakeStatus.COUNTING) throw new ConflictException('این انبارگردانی بسته شده است');
    if (st.warehouses.some((w) => w.status !== StocktakeWarehouseStatus.SUBMITTED)) {
      throw new ConflictException('همه انبارها باید شمارش را ارسال کرده باشند');
    }

    const invoices = await this.prisma.$transaction(
      async (tx) => {
        const created: any[] = [];
        for (const sheet of st.warehouses) {
          const lines: any[] = [];
          for (const l of sheet.lines) {
            const counted = l.countedQuantity ?? 0;
            const current = await this.stock.onHand(tx, sheet.warehouseId, l.productId);
            const diff = counted - current; // against the REAL current stock, which is locked and equals the snapshot
            if (diff < 0) {
              const picks = await this.stock.allocate(tx, sheet.warehouseId, l.productId, -diff);
              await this.stock.deduct(tx, picks);
              lines.push(...picks.map((p) => ({ productId: p.productId, lotNumber: p.lotNumber, serialNumber: p.serialNumber, manufactureDate: p.manufactureDate, expiryDate: p.expiryDate, quantity: -p.quantity })));
            } else if (diff > 0) {
              const item = { productId: l.productId, lotNumber: `${st.number}-ADJ`, quantity: diff };
              await this.stock.addItems(tx, sheet.warehouseId, [item]);
              lines.push({ productId: l.productId, lotNumber: item.lotNumber, quantity: diff });
            }
          }
          if (lines.length) {
            created.push(await this.invoices.create(tx, {
              type: WarehouseInvoiceType.ADJUSTMENT, warehouseId: sheet.warehouseId, refType: 'STOCKTAKE', refId: st.id, issuedById: user.id,
              notes: `اصلاح موجودی بر اساس انبارگردانی ${st.number}`, lines,
            }));
          }
        }
        await tx.stocktake.update({ where: { id: stocktakeId }, data: { status: StocktakeStatus.COMPLETED, completedAt: new Date(), completedById: user.id } });
        return created;
      },
      { timeout: 60000, maxWait: 10000 },
    );

    const keepers = (await this.prisma.warehouse.findMany({ where: { id: { in: st.warehouses.map((w) => w.warehouseId) } }, select: { keeperId: true } })).map((w) => w.keeperId).filter(Boolean) as string[];
    await this.notifications.notifyUsers(keepers, {
      type: 'STOCKTAKE_COMPLETED', category: 'WAREHOUSE', title: 'انبارگردانی نهایی شد',
      body: `انبارگردانی ${st.number} نهایی و موجودی به‌روزرسانی شد؛ انبارها از حالت قفل خارج شدند.`, entityType: 'Stocktake', entityId: stocktakeId, actorId: user.id,
    });
    return { stocktakeId, status: StocktakeStatus.COMPLETED, adjustmentInvoices: invoices };
  }

  async cancel(stocktakeId: string, user: AuthenticatedUser) {
    const st = await this.prisma.stocktake.findUnique({ where: { id: stocktakeId } });
    if (!st) throw new NotFoundException('انبارگردانی یافت نشد');
    if (st.status !== StocktakeStatus.COUNTING) throw new ConflictException('این انبارگردانی بسته شده است');
    await this.prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: StocktakeStatus.CANCELLED, completedAt: new Date(), completedById: user.id } });
    return { stocktakeId, status: StocktakeStatus.CANCELLED };
  }

  assertManagerOnly(user: AuthenticatedUser) {
    if (!this.wa.isManager(user) && !this.access.hasPermission(user, 'stocktakes', 'manage')) throw new ForbiddenException();
  }
}
