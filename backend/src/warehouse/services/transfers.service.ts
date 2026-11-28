import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequenceService } from '../../common/shared/sequence.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ci, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { StockTransferStatus, WarehouseInvoiceType } from '../../generated/prisma/enums';
import { ApproveTransferDto, CreateTransferDto, QueryTransfersDto } from '../dto/warehouse.dto';
import { InvoicesService } from './invoices.service';
import { StockService } from './stock.service';
import { WarehouseAccessService } from './warehouse-access.service';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wa: WarehouseAccessService,
    private readonly stock: StockService,
    private readonly invoices: InvoicesService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly include = {
    fromWarehouse: { select: { id: true, name: true, number: true, keeperId: true } },
    toWarehouse: { select: { id: true, name: true, number: true, keeperId: true } },
    requestedBy: { select: { id: true, name: true } },
    lines: { include: { product: { select: { id: true, code: true, fullName: true } } } },
  } as const;

  /** The DESTINATION keeper requests; the SOURCE keeper approves/rejects. */
  async create(dto: CreateTransferDto, user: AuthenticatedUser) {
    if (dto.fromWarehouseId === dto.toWarehouseId) throw new BadRequestException('انبار مبدا و مقصد نمی‌تواند یکسان باشد');
    await this.wa.assertKeeperOrManager(user, dto.toWarehouseId);
    const from = await this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } });
    if (!from || !from.isActive) throw new NotFoundException('انبار مبدا یافت نشد');
    await this.wa.assertSubWarehouses([dto.fromWarehouseId, dto.toWarehouseId]);
    await this.wa.assertUnlocked([dto.fromWarehouseId, dto.toWarehouseId]);
    const ids = dto.lines.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('محصول تکراری در درخواست وجود دارد');

    const transfer = await this.prisma.$transaction(async (tx) => {
      const number = await this.sequence.next('TRQ', tx);
      return tx.stockTransfer.create({
        data: {
          number, fromWarehouseId: dto.fromWarehouseId, toWarehouseId: dto.toWarehouseId, requestedById: user.id, notes: dto.notes,
          lines: { create: dto.lines.map((l) => ({ productId: l.productId, requestedQuantity: l.quantity })) },
        },
        include: this.include,
      });
    });
    await this.notifications.notifyUsers([from.keeperId].filter(Boolean) as string[], {
      type: 'STOCK_TRANSFER_REQUESTED', category: 'WAREHOUSE', title: 'درخواست انتقال کالا',
      body: `درخواست انتقال ${transfer.number} از انبار شما ثبت شد.`, entityType: 'StockTransfer', entityId: transfer.id, actorId: user.id,
    });
    return transfer;
  }

  async list(q: QueryTransfersDto, user: AuthenticatedUser) {
    const { skip, take } = pageArgs(q);
    const visible = await this.wa.visibleIds(user);
    const conditions: any[] = [];
    if (visible) {
      if (q.direction === 'incoming') conditions.push({ toWarehouseId: { in: visible } });
      else if (q.direction === 'outgoing') conditions.push({ fromWarehouseId: { in: visible } });
      else conditions.push({ OR: [{ fromWarehouseId: { in: visible } }, { toWarehouseId: { in: visible } }] });
    }
    if (q.status) conditions.push({ status: q.status });
    if (q.fromWarehouseId) conditions.push({ fromWarehouseId: q.fromWarehouseId });
    if (q.toWarehouseId) conditions.push({ toWarehouseId: q.toWarehouseId });
    if (q.requestedById) conditions.push({ requestedById: q.requestedById });
    if (q.productId) conditions.push({ lines: { some: { productId: q.productId } } });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { number: ci(t) }, { notes: ci(t) }, { rejectReason: ci(t) },
        { fromWarehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } },
        { toWarehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } },
        { requestedBy: { is: { name: ci(t) } } },
        { lines: { some: { product: { is: { OR: productSearch(t) } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { createdAt: (d) => ({ createdAt: d }), number: (d) => ({ number: d }), status: (d) => ({ status: d }) }, [{ createdAt: 'desc' }, { id: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockTransfer.findMany({ where, skip, take, orderBy, include: this.include }),
      this.prisma.stockTransfer.count({ where }),
    ]);
    return paged(items, total, q);
  }


  async get(id: string, user: AuthenticatedUser) {
    const t = await this.prisma.stockTransfer.findUnique({ where: { id }, include: this.include });
    if (!t) throw new NotFoundException('درخواست انتقال یافت نشد');
    if (!this.wa.isManager(user) && ![t.fromWarehouse.keeperId, t.toWarehouse.keeperId].includes(user.id)) {
      throw new ForbiddenException('دسترسی مجاز نیست');
    }
    return t;
  }

  /** Source keeper approves → stock leaves the source (IN_TRANSIT) and the transfer invoice is issued. */
  async approve(id: string, dto: ApproveTransferDto, user: AuthenticatedUser) {
    const t = await this.prisma.stockTransfer.findUnique({ where: { id }, include: { lines: true, toWarehouse: true } });
    if (!t) throw new NotFoundException('درخواست انتقال یافت نشد');
    if (t.status !== StockTransferStatus.REQUESTED) throw new ConflictException('وضعیت درخواست اجازه این عملیات را نمی‌دهد');
    await this.wa.assertKeeperOrManager(user, t.fromWarehouseId);

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await this.wa.assertUnlocked([t.fromWarehouseId, t.toWarehouseId], tx);
        const allPicks: any[] = [];
        for (const line of t.lines) {
          const manual = dto.picks?.filter((p) => p.productId === line.productId);
          const picks = await this.stock.allocate(tx, t.fromWarehouseId, line.productId, line.requestedQuantity, manual?.length ? manual : undefined);
          await this.stock.deduct(tx, picks);
          await tx.stockTransferLine.update({ where: { id: line.id }, data: { sentItems: picks.map((p) => ({ lotNumber: p.lotNumber, serialNumber: p.serialNumber, manufactureDate: p.manufactureDate, expiryDate: p.expiryDate, quantity: p.quantity })) } });
          allPicks.push(...picks);
        }
        const invoice = await this.invoices.create(tx, {
          type: WarehouseInvoiceType.TRANSFER, warehouseId: t.fromWarehouseId, counterWarehouseId: t.toWarehouseId,
          refType: 'TRANSFER', refId: t.id, issuedById: user.id, notes: t.notes,
          lines: allPicks.map((p) => ({ productId: p.productId, lotNumber: p.lotNumber, serialNumber: p.serialNumber, manufactureDate: p.manufactureDate, expiryDate: p.expiryDate, quantity: p.quantity })),
        });
        return tx.stockTransfer.update({
          where: { id }, data: { status: StockTransferStatus.IN_TRANSIT, decidedById: user.id, decidedAt: new Date(), invoiceId: invoice.id },
          include: this.include,
        });
      },
      { timeout: 30000, maxWait: 10000 },
    );
    await this.notifications.notifyUsers([t.toWarehouse.keeperId, t.requestedById].filter(Boolean) as string[], {
      type: 'STOCK_TRANSFER_IN_TRANSIT', category: 'WAREHOUSE', title: 'کالای انتقالی ارسال شد',
      body: `انتقال ${t.number} از انبار مبدا خارج شد؛ پس از دریافت، ورود را تایید کنید.`,
      entityType: 'StockTransfer', entityId: id, actorId: user.id,
    });
    return updated;
  }

  async reject(id: string, reason: string, user: AuthenticatedUser) {
    const t = await this.prisma.stockTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('درخواست انتقال یافت نشد');
    if (t.status !== StockTransferStatus.REQUESTED) throw new ConflictException('وضعیت درخواست اجازه این عملیات را نمی‌دهد');
    await this.wa.assertKeeperOrManager(user, t.fromWarehouseId);
    const updated = await this.prisma.stockTransfer.update({
      where: { id }, data: { status: StockTransferStatus.REJECTED, decidedById: user.id, decidedAt: new Date(), rejectReason: reason }, include: this.include,
    });
    await this.notifications.notifyUsers([t.requestedById], {
      type: 'STOCK_TRANSFER_REJECTED', category: 'WAREHOUSE', title: 'درخواست انتقال رد شد',
      body: `انتقال ${t.number} رد شد: ${reason}`, entityType: 'StockTransfer', entityId: id, actorId: user.id,
    });
    return updated;
  }

  /** Destination keeper confirms arrival → stock is added to the destination warehouse. */
  async receive(id: string, user: AuthenticatedUser) {
    const t = await this.prisma.stockTransfer.findUnique({ where: { id }, include: { lines: true, fromWarehouse: true } });
    if (!t) throw new NotFoundException('درخواست انتقال یافت نشد');
    if (t.status !== StockTransferStatus.IN_TRANSIT) throw new ConflictException('این انتقال در وضعیت «در راه» نیست');
    await this.wa.assertKeeperOrManager(user, t.toWarehouseId);

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await this.wa.assertUnlocked([t.toWarehouseId], tx);
        for (const line of t.lines) {
          const sent = (line.sentItems as any[]) ?? [];
          await this.stock.addItems(tx, t.toWarehouseId, sent.map((s) => ({
            productId: line.productId, lotNumber: s.lotNumber, serialNumber: s.serialNumber,
            manufactureDate: s.manufactureDate ? new Date(s.manufactureDate) : null,
            expiryDate: s.expiryDate ? new Date(s.expiryDate) : null, quantity: s.quantity,
          })), t.invoiceId ?? undefined);
        }
        return tx.stockTransfer.update({ where: { id }, data: { status: StockTransferStatus.RECEIVED, receivedById: user.id, receivedAt: new Date() }, include: this.include });
      },
      { timeout: 30000, maxWait: 10000 },
    );
    await this.notifications.notifyUsers([t.fromWarehouse.keeperId].filter(Boolean) as string[], {
      type: 'STOCK_TRANSFER_RECEIVED', category: 'WAREHOUSE', title: 'ورود کالای انتقالی تایید شد',
      body: `انتقال ${t.number} در انبار مقصد دریافت شد.`, entityType: 'StockTransfer', entityId: id, actorId: user.id,
    });
    return updated;
  }
}
