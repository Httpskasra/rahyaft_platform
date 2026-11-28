import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { PurchasingService } from '../../commerce/purchasing/purchasing.service';
import { WarehouseInvoiceType } from '../../generated/prisma/enums';
import { CreateReceiptDto } from '../dto/warehouse.dto';
import { InvoicesService } from './invoices.service';
import { StockService, NewStockItem } from './stock.service';
import { WarehouseAccessService } from './warehouse-access.service';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wa: WarehouseAccessService,
    private readonly stock: StockService,
    private readonly invoices: InvoicesService,
    private readonly purchasing: PurchasingService,
    private readonly notifications: NotificationsService,
  ) {}

  async incomingOrders(user: AuthenticatedUser) {
    return this.purchasing.incomingOrders(await this.wa.visibleIds(user));
  }

  async create(dto: CreateReceiptDto, user: AuthenticatedUser) {
    const warehouse = await this.wa.assertKeeperOrManager(user, dto.warehouseId);
    await this.wa.assertSubWarehouses([dto.warehouseId]);
    await this.wa.assertUnlocked([dto.warehouseId]);

    const products = await this.prisma.product.findMany({ where: { id: { in: [...new Set(dto.lines.map((l) => l.productId))] } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    if (dto.purchaseOrderId) {
      const order = await this.prisma.purchaseOrder.findUnique({ where: { id: dto.purchaseOrderId } });
      if (!order) throw new NotFoundException('سفارش یافت نشد');
      if (order.warehouseId !== dto.warehouseId) throw new BadRequestException('انبار مقصد این سفارش با انبار انتخابی یکی نیست');
    }

    const items: NewStockItem[] = [];
    const seenSerials = new Set<string>();
    for (const l of dto.lines) {
      const p = byId.get(l.productId);
      if (!p) throw new BadRequestException('محصول نامعتبر است');
      const mfg = l.manufactureDate ? new Date(l.manufactureDate) : null;
      const exp = l.expiryDate ? new Date(l.expiryDate) : null;
      if (mfg && exp && exp < mfg) throw new BadRequestException(`تاریخ انقضای «${p.fullName}» قبل از تاریخ تولید است`);

      const serials = (l.serialNumbers ?? []).map((s) => s.trim()).filter(Boolean);
      if (p.trackSerial && !serials.length) throw new BadRequestException(`برای «${p.fullName}» ثبت شماره سریال الزامی است`);
      if (serials.length) {
        for (const s of serials) {
          const key = `${p.id}:${s}`;
          if (seenSerials.has(key)) throw new BadRequestException(`شماره سریال ${s} تکراری است`);
          seenSerials.add(key);
          const existing = await this.stock.serialInStock(this.prisma, p.id, s);
          if (existing) throw new BadRequestException(`شماره سریال ${s} قبلاً در انبار «${existing.warehouse.name}» ثبت شده است`);
          items.push({ productId: p.id, lotNumber: l.lotNumber, serialNumber: s, manufactureDate: mfg, expiryDate: exp, quantity: 1 });
        }
      } else {
        if (!l.quantity) throw new BadRequestException(`تعداد «${p.fullName}» الزامی است`);
        items.push({ productId: p.id, lotNumber: l.lotNumber, manufactureDate: mfg, expiryDate: exp, quantity: l.quantity });
      }
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.wa.assertUnlocked([dto.warehouseId], tx);
        const invoice = await this.invoices.create(tx, {
          type: WarehouseInvoiceType.RECEIPT, warehouseId: dto.warehouseId, notes: dto.notes, issuedById: user.id,
          refType: dto.purchaseOrderId ? 'PURCHASE_ORDER' : undefined, refId: dto.purchaseOrderId,
          lines: items.map((i) => ({ productId: i.productId, lotNumber: i.lotNumber, serialNumber: i.serialNumber, manufactureDate: i.manufactureDate, expiryDate: i.expiryDate, quantity: i.quantity })),
        });
        await this.stock.addItems(tx, dto.warehouseId, items, invoice.id);

        let finalized = false;
        let order: any = null;
        if (dto.purchaseOrderId) {
          const perProduct = new Map<string, number>();
          for (const i of items) perProduct.set(i.productId, (perProduct.get(i.productId) ?? 0) + i.quantity);
          const r = await this.purchasing.applyReceipt(tx, dto.purchaseOrderId, [...perProduct].map(([productId, quantity]) => ({ productId, quantity })), user.id);
          finalized = r.finalized;
          order = r.order;
        }
        return { invoice, finalized, order };
      },
      { timeout: 30000, maxWait: 10000 },
    );

    if (result.order) {
      await this.notifications.notifyUsers([result.order.buyerId, result.order.requesterId].filter(Boolean) as string[], {
        type: result.finalized ? 'PURCHASE_ORDER_FINALIZED' : 'PURCHASE_ORDER_PARTIALLY_RECEIVED',
        category: 'COMMERCE',
        title: result.finalized ? 'سفارش نهایی شد' : 'بخشی از سفارش وارد انبار شد',
        body: `سفارش ${result.order.number} در انبار ${warehouse.name} ${result.finalized ? 'به طور کامل دریافت و نهایی شد' : 'به صورت جزئی دریافت شد'}.`,
        entityType: 'PurchaseOrder', entityId: result.order.id, actorId: user.id,
      });
    }
    return { invoice: result.invoice, orderFinalized: result.finalized };
  }
}
