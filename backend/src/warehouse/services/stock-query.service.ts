import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ci, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { QueryStockDto } from '../dto/warehouse.dto';
import { WarehouseAccessService } from './warehouse-access.service';
import { WarehousesService } from './warehouses.service';

@Injectable()
export class StockQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wa: WarehouseAccessService,
    private readonly warehouses: WarehousesService,
  ) {}

  /** Warehouses whose stock the user may see; `null` = all. */
  private async scope(user: AuthenticatedUser, q: QueryStockDto): Promise<string[] | null> {
    const allowed = await this.wa.visibleIds(user);
    if (q.warehouseId) {
      await this.warehouses.assertCanView(user, q.warehouseId);
      return q.includeChildren === false ? [q.warehouseId] : this.wa.descendantIds([q.warehouseId]);
    }
    return allowed;
  }

  /** Product-level conditions shared by summary & items (id, type, category + multi-word search on the product). */
  private productWhere(q: QueryStockDto, extraTermFields?: (t: string) => any[]) {
    const and: any[] = [];
    if (q.typeId) and.push({ typeId: q.typeId });
    if (q.categoryId) and.push({ categoryId: q.categoryId });
    return { and, terms: searchTerms(q), extraTermFields };
  }

  private productSearchFields(t: string) {
    return [...productSearch(t), { extraPrefix: ci(t) }, { type: { is: { name: ci(t) } } }, { category: { is: { name: ci(t) } } }];
  }

  /**
   * Product-level stock: total across the scope + breakdown per warehouse.
   * Manager without a warehouse filter → company-wide total (sum of all sub-warehouses).
   */
  async summary(user: AuthenticatedUser, q: QueryStockDto) {
    const scope = await this.scope(user, q);
    const productAnd: any[] = [];
    if (q.typeId) productAnd.push({ typeId: q.typeId });
    if (q.categoryId) productAnd.push({ categoryId: q.categoryId });
    productAnd.push(...termConditions(searchTerms(q), (t) => this.productSearchFields(t)));
    const where: any = {
      quantity: { gt: 0 },
      ...(q.productId ? { productId: q.productId } : {}),
      ...(productAnd.length ? { product: { is: { AND: productAnd } } } : {}),
      ...(scope ? { warehouseId: { in: scope } } : {}),
    };
    const grouped = await this.prisma.stockItem.groupBy({ by: ['productId', 'warehouseId'], where, _sum: { quantity: true } });
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(grouped.map((g) => g.productId))] } },
      select: { id: true, code: true, fullName: true, trackSerial: true },
    });
    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: [...new Set(grouped.map((g) => g.warehouseId))] } }, select: { id: true, name: true, number: true },
    });
    const wById = new Map(warehouses.map((w) => [w.id, w]));
    let rows = products.map((p) => {
      const parts = grouped.filter((g) => g.productId === p.id);
      return {
        product: p,
        totalQuantity: parts.reduce((s, g) => s + (g._sum.quantity ?? 0), 0),
        byWarehouse: parts.map((g) => ({ warehouse: wById.get(g.warehouseId), quantity: g._sum.quantity ?? 0 })),
      };
    });
    if (q.minQuantity !== undefined) rows = rows.filter((r) => r.totalQuantity >= q.minQuantity!);
    if (q.maxQuantity !== undefined) rows = rows.filter((r) => r.totalQuantity <= q.maxQuantity!);
    const dir = q.sortDir === 'desc' ? -1 : 1;
    const cmp: Record<string, (a: any, b: any) => number> = {
      code: (a, b) => a.product.code.localeCompare(b.product.code), name: (a, b) => a.product.fullName.localeCompare(b.product.fullName),
      totalQuantity: (a, b) => a.totalQuantity - b.totalQuantity,
    };
    rows.sort((a, b) => dir * (cmp[q.sortBy ?? 'code'] ?? cmp.code)(a, b));
    const { skip, take } = pageArgs(q);
    return paged(rows.slice(skip, skip + take), rows.length, q, { grandTotalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0) });
  }

  /** Lot / serial level detail with expiry filters. */
  async items(user: AuthenticatedUser, q: QueryStockDto) {
    const scope = await this.scope(user, q);
    const conditions: any[] = [{ quantity: { gt: 0 } }];
    if (scope) conditions.push({ warehouseId: { in: scope } });
    if (q.productId) conditions.push({ productId: q.productId });
    if (q.typeId) conditions.push({ product: { is: { typeId: q.typeId } } });
    if (q.categoryId) conditions.push({ product: { is: { categoryId: q.categoryId } } });
    if (q.lotNumber) conditions.push({ lotNumber: ci(q.lotNumber) });
    if (q.serialNumber) conditions.push({ serialNumber: ci(q.serialNumber) });
    const now = new Date();
    if (q.expired === true) conditions.push({ expiryDate: { lt: now } });
    if (q.expired === false) conditions.push({ OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] });
    if (q.expiringInDays) conditions.push({ expiryDate: { gte: now, lte: new Date(now.getTime() + q.expiringInDays * 86400000) } });
    const expiry = dateRange('expiryDate', q.expiryFrom, q.expiryTo);
    if (expiry) conditions.push(expiry);
    const entered = dateRange('createdAt', q.from, q.to); // تاریخ ورود
    if (entered) conditions.push(entered);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { lotNumber: ci(t) }, { serialNumber: ci(t) },
        { product: { is: { OR: this.productSearchFields(t) } } },
        { warehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } },
      ]),
    );
    const where = { AND: conditions };
    const orderBy = orderByOf(
      q,
      {
        expiryDate: (d) => ({ expiryDate: { sort: d, nulls: 'last' } }), createdAt: (d) => ({ createdAt: d }),
        quantity: (d) => ({ quantity: d }), lotNumber: (d) => ({ lotNumber: d }),
      },
      [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    );
    const { skip, take } = pageArgs(q);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockItem.findMany({
        where, skip, take, orderBy,
        include: { product: { select: { id: true, code: true, fullName: true } }, warehouse: { select: { id: true, name: true, number: true } } },
      }),
      this.prisma.stockItem.count({ where }),
    ]);
    return paged(items, total, q);
  }

  async getItem(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.stockItem.findUnique({ where: { id }, include: { product: true, warehouse: true } });
    if (!item) throw new NotFoundException('قلم موجودی یافت نشد');
    await this.warehouses.assertCanView(user, item.warehouseId);
    return item;
  }
}
