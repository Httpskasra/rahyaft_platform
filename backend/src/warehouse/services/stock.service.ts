import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface StockPick {
  stockItemId: string;
  productId: string;
  quantity: number;
  lotNumber: string;
  serialNumber: string | null;
  manufactureDate: Date | null;
  expiryDate: Date | null;
}

export interface NewStockItem {
  productId: string;
  lotNumber: string;
  serialNumber?: string | null;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  quantity: number;
}

const sameDate = (a?: Date | null, b?: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quantity reserved by outbound dispatches that were accepted/allocated but not yet deducted. */
  async reserved(client: any, warehouseId: string, productId: string): Promise<number> {
    const agg = await client.outboundDispatchLine.aggregate({
      where: { productId, dispatch: { warehouseId, status: { in: ['PENDING_KEEPER', 'PREPARING'] } } },
      _sum: { quantity: true },
    });
    return agg._sum.quantity ?? 0;
  }

  async onHand(client: any, warehouseId: string, productId: string): Promise<number> {
    const agg = await client.stockItem.aggregate({ where: { warehouseId, productId, quantity: { gt: 0 } }, _sum: { quantity: true } });
    return agg._sum.quantity ?? 0;
  }

  /** FEFO allocation (earliest expiry first) unless explicit picks are given. Does NOT modify stock. */
  async allocate(
    client: any, warehouseId: string, productId: string, quantity: number,
    picks?: { stockItemId: string; quantity: number }[],
  ): Promise<StockPick[]> {
    if (quantity <= 0) throw new BadRequestException('تعداد باید بزرگتر از صفر باشد');
    const toPick = (i: any, q: number): StockPick => ({
      stockItemId: i.id, productId: i.productId, quantity: q, lotNumber: i.lotNumber, serialNumber: i.serialNumber,
      manufactureDate: i.manufactureDate, expiryDate: i.expiryDate,
    });

    if (picks?.length) {
      const total = picks.reduce((s, p) => s + p.quantity, 0);
      if (total !== quantity) throw new BadRequestException('جمع تعداد انتخابی با تعداد درخواستی برابر نیست');
      const items = await client.stockItem.findMany({ where: { id: { in: picks.map((p) => p.stockItemId) } } });
      return picks.map((p) => {
        const item = items.find((i: any) => i.id === p.stockItemId);
        if (!item || item.warehouseId !== warehouseId || item.productId !== productId) {
          throw new BadRequestException('قلم انتخابی متعلق به این انبار/محصول نیست');
        }
        if (p.quantity <= 0 || p.quantity > item.quantity) throw new BadRequestException(`موجودی قلم ${item.lotNumber} کافی نیست`);
        return toPick(item, p.quantity);
      });
    }

    const items = await client.stockItem.findMany({
      where: { warehouseId, productId, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    let left = quantity;
    const out: StockPick[] = [];
    for (const item of items) {
      if (left <= 0) break;
      const take = Math.min(left, item.quantity);
      out.push(toPick(item, take));
      left -= take;
    }
    if (left > 0) throw new BadRequestException(`موجودی کافی نیست (کسری ${left} عدد)`);
    return out;
  }

  /** Atomically decrements; fails if a concurrent operation already took the stock. */
  async deduct(tx: any, picks: StockPick[]) {
    for (const p of picks) {
      const res = await tx.stockItem.updateMany({
        where: { id: p.stockItemId, quantity: { gte: p.quantity } },
        data: { quantity: { decrement: p.quantity } },
      });
      if (res.count !== 1) throw new ConflictException('موجودی همزمان تغییر کرد؛ دوباره تلاش کنید');
    }
  }

  /** Adds stock; identical non-serial lots are merged. */
  async addItems(tx: any, warehouseId: string, items: NewStockItem[], invoiceId?: string) {
    for (const it of items) {
      if (it.quantity <= 0) continue;
      if (!it.serialNumber) {
        const candidates = await tx.stockItem.findMany({
          where: { warehouseId, productId: it.productId, lotNumber: it.lotNumber, serialNumber: null },
        });
        const same = candidates.find((c: any) => sameDate(c.manufactureDate, it.manufactureDate) && sameDate(c.expiryDate, it.expiryDate));
        if (same) {
          await tx.stockItem.update({ where: { id: same.id }, data: { quantity: { increment: it.quantity } } });
          continue;
        }
      }
      await tx.stockItem.create({
        data: {
          warehouseId, productId: it.productId, lotNumber: it.lotNumber, serialNumber: it.serialNumber ?? null,
          manufactureDate: it.manufactureDate ?? null, expiryDate: it.expiryDate ?? null, quantity: it.quantity, invoiceId,
        },
      });
    }
  }

  async serialInStock(client: any, productId: string, serial: string) {
    return client.stockItem.findFirst({ where: { productId, serialNumber: serial, quantity: { gt: 0 } }, include: { warehouse: { select: { name: true } } } });
  }
}
