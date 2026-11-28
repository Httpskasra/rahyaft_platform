import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../../common/shared/access.service';
import { SequenceService } from '../../common/shared/sequence.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ci, customerSearch, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import {
  DeliveryType, OutboundDispatchStatus, OutboundRequestStatus, SupplierKind, WarehouseInvoiceType,
} from '../../generated/prisma/enums';
import {
  CreateDispatchDto, CreateOutboundDto, MarkReadyDto, QueryDispatchesDto, QueryOutboundDto,
} from '../dto/warehouse.dto';
import { InvoicesService } from './invoices.service';
import { StockService } from './stock.service';
import { WarehouseAccessService } from './warehouse-access.service';

export const MAX_DISPATCH_VIDEO_SIZE = 50 * 1024 * 1024; // short inspection clips
const VIDEO_EXT: Record<string, string> = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };

function hasVideoSignature(mime: string, b: Buffer) {
  if (mime === 'video/webm') return b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return b.length > 12 && b.subarray(4, 8).toString('ascii') === 'ftyp'; // mp4 / mov
}

@Injectable()
export class OutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly wa: WarehouseAccessService,
    private readonly stock: StockService,
    private readonly invoices: InvoicesService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly dispatchInclude = {
    warehouse: { select: { id: true, name: true, number: true, keeperId: true } },
    lines: { include: { product: { select: { id: true, code: true, fullName: true } } } },
    request: {
      select: {
        id: true, number: true, saleOrderNumber: true, notes: true, customerId: true,
        customer: { select: { id: true, type: true, firstName: true, lastName: true, organizationName: true, mobile: true, phone: true } },
      },
    },
    transportSupplier: { select: { id: true, entityType: true, firstName: true, lastName: true, companyName: true } },
  } as const;

  // ═════════ requests (created by sales — manual API until the sales module exists) ═════════
  async createRequest(dto: CreateOutboundDto, user: AuthenticatedUser) {
    const ids = dto.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('محصول تکراری وجود دارد');
    const count = await this.prisma.product.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new BadRequestException('محصول نامعتبر است');
    if (dto.customerId) {
      const c = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!c) throw new NotFoundException('مشتری یافت نشد');
    }
    const request = await this.prisma.$transaction(async (tx) => {
      const number = await this.sequence.next('OUT', tx);
      return tx.outboundRequest.create({
        data: {
          number, saleOrderNumber: dto.saleOrderNumber?.trim() || number, customerId: dto.customerId, requestedById: user.id, notes: dto.notes,
          items: { create: dto.items },
        },
        include: { items: { include: { product: { select: { id: true, code: true, fullName: true } } } } },
      });
    });
    const managers = await this.access.userIdsWithPermission('warehouses', 'manage');
    await this.notifications.notifyUsers(managers, {
      type: 'OUTBOUND_REQUEST_CREATED', category: 'WAREHOUSE', title: 'درخواست خروج کالا',
      body: `درخواست خروج ${request.number} ثبت شد؛ لطفاً زیرانبار را انتخاب کنید.`,
      entityType: 'OutboundRequest', entityId: request.id, actorId: user.id,
    });
    return request;
  }

  async listRequests(q: QueryOutboundDto) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (q.status) conditions.push({ status: q.status });
    if (q.customerId) conditions.push({ customerId: q.customerId });
    if (q.requestedById) conditions.push({ requestedById: q.requestedById });
    if (q.productId) conditions.push({ items: { some: { productId: q.productId } } });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { number: ci(t) }, { saleOrderNumber: ci(t) }, { notes: ci(t) },
        { customer: { is: { OR: customerSearch(t) } } }, { requestedBy: { is: { name: ci(t) } } },
        { items: { some: { product: { is: { OR: productSearch(t) } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { createdAt: (d) => ({ createdAt: d }), number: (d) => ({ number: d }), status: (d) => ({ status: d }) }, [{ createdAt: 'desc' }, { id: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.outboundRequest.findMany({
        where, skip, take, orderBy,
        include: { customer: { select: { id: true, type: true, firstName: true, lastName: true, organizationName: true } }, _count: { select: { items: true, dispatches: true } } },
      }),
      this.prisma.outboundRequest.count({ where }),
    ]);
    return paged(items, total, q);
  }


  async getRequest(id: string) {
    const r = await this.prisma.outboundRequest.findUnique({
      where: { id },
      include: {
        customer: true, requestedBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, fullName: true } } } },
        dispatches: { include: this.dispatchInclude, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!r) throw new NotFoundException('درخواست خروج یافت نشد');
    return r;
  }

  /** Per item: how much is still unallocated and which warehouses have free stock (on hand − reserved). */
  async availability(id: string) {
    const r = await this.getRequest(id);
    const result: any[] = [];
    for (const item of r.items) {
      const allocated = r.dispatches.filter((d) => d.status !== OutboundDispatchStatus.REJECTED)
        .flatMap((d) => d.lines).filter((l) => l.productId === item.productId).reduce((s, l) => s + l.quantity, 0);
      const grouped = await this.prisma.stockItem.groupBy({ by: ['warehouseId'], where: { productId: item.productId, quantity: { gt: 0 } }, _sum: { quantity: true } });
      const warehouses = await this.prisma.warehouse.findMany({ where: { id: { in: grouped.map((g) => g.warehouseId) }, isActive: true }, select: { id: true, name: true, number: true } });
      const options: any[] = [];
      for (const w of warehouses) {
        const onHand = grouped.find((g) => g.warehouseId === w.id)?._sum.quantity ?? 0;
        const reserved = await this.stock.reserved(this.prisma, w.id, item.productId);
        options.push({ warehouse: w, onHand, reserved, free: onHand - reserved });
      }
      result.push({ product: item.product, requested: item.quantity, allocated, remaining: item.quantity - allocated, warehouses: options.filter((o) => o.free > 0) });
    }
    return result;
  }

  async cancelRequest(id: string, user: AuthenticatedUser) {
    const r = await this.getRequest(id);
    if (r.status === OutboundRequestStatus.COMPLETED || r.status === OutboundRequestStatus.CANCELLED) throw new ConflictException('درخواست قابل لغو نیست');
    if (r.dispatches.some((d) => d.status === OutboundDispatchStatus.READY_FOR_DELIVERY || d.status === OutboundDispatchStatus.DELIVERED)) {
      throw new ConflictException('بخشی از کالا خارج شده است و درخواست قابل لغو نیست');
    }
    await this.prisma.$transaction([
      this.prisma.outboundDispatch.updateMany({ where: { requestId: id, status: { in: [OutboundDispatchStatus.PENDING_KEEPER, OutboundDispatchStatus.PREPARING] } }, data: { status: OutboundDispatchStatus.REJECTED, rejectReason: `لغو درخواست توسط ${user.name}` } }),
      this.prisma.outboundRequest.update({ where: { id }, data: { status: OutboundRequestStatus.CANCELLED } }),
    ]);
    return this.getRequest(id);
  }

  // ═════════ dispatches (manager → sub-warehouse keeper) ═════════
  async createDispatch(requestId: string, dto: CreateDispatchDto, user: AuthenticatedUser) {
    const r = await this.getRequest(requestId);
    if (r.status === OutboundRequestStatus.COMPLETED || r.status === OutboundRequestStatus.CANCELLED) throw new ConflictException('این درخواست بسته شده است');
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse || !warehouse.isActive) throw new NotFoundException('زیرانبار یافت نشد');
    if (!warehouse.keeperId) throw new BadRequestException('برای این زیرانبار انباردار تعریف نشده است');
    await this.wa.assertSubWarehouses([dto.warehouseId]);
    await this.wa.assertUnlocked([dto.warehouseId]);

    const lineIds = dto.lines.map((l) => l.productId);
    if (new Set(lineIds).size !== lineIds.length) throw new BadRequestException('محصول تکراری وجود دارد');
    for (const line of dto.lines) {
      const item = r.items.find((i) => i.productId === line.productId);
      if (!item) throw new BadRequestException('محصول در این درخواست وجود ندارد');
      const allocated = r.dispatches.filter((d) => d.status !== OutboundDispatchStatus.REJECTED).flatMap((d) => d.lines)
        .filter((l) => l.productId === line.productId).reduce((s, l) => s + l.quantity, 0);
      if (line.quantity > item.quantity - allocated) throw new BadRequestException('تعداد انتخابی از باقیمانده درخواست بیشتر است');
      const free = (await this.stock.onHand(this.prisma, dto.warehouseId, line.productId)) - (await this.stock.reserved(this.prisma, dto.warehouseId, line.productId));
      if (line.quantity > free) throw new BadRequestException(`موجودی آزاد این انبار برای «${item.product.fullName}» ${free} عدد است`);
    }

    const dispatch = await this.prisma.$transaction(async (tx) => {
      const d = await tx.outboundDispatch.create({
        data: { requestId, warehouseId: dto.warehouseId, lines: { create: dto.lines } }, include: this.dispatchInclude,
      });
      await tx.outboundRequest.update({ where: { id: requestId }, data: { status: OutboundRequestStatus.IN_PROGRESS } });
      return d;
    });
    await this.notifications.notifyUsers([warehouse.keeperId], {
      type: 'OUTBOUND_DISPATCH_ASSIGNED', category: 'WAREHOUSE', title: 'درخواست خروج کالا برای انبار شما',
      body: `درخواست ${r.number} برای خروج از انبار «${warehouse.name}» ارسال شد.`, entityType: 'OutboundDispatch', entityId: dispatch.id, actorId: user.id,
    });
    return dispatch;
  }

  async listDispatches(q: QueryDispatchesDto, user: AuthenticatedUser) {
    const { skip, take } = pageArgs(q);
    const visible = await this.wa.visibleIds(user);
    const conditions: any[] = [];
    if (visible) conditions.push({ warehouseId: { in: visible } });
    if (q.warehouseId) conditions.push({ warehouseId: q.warehouseId });
    if (q.status) conditions.push({ status: q.status });
    if (q.requestId) conditions.push({ requestId: q.requestId });
    if (q.deliveryType) conditions.push({ deliveryType: q.deliveryType });
    if (q.transportSupplierId) conditions.push({ transportSupplierId: q.transportSupplierId });
    if (q.productId) conditions.push({ lines: { some: { productId: q.productId } } });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { request: { is: { OR: [{ number: ci(t) }, { saleOrderNumber: ci(t) }, { customer: { is: { OR: customerSearch(t) } } }] } } },
        { warehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } },
        { receiverName: ci(t) }, { receiverPhone: { contains: t } }, { transportNote: ci(t) },
        { lines: { some: { product: { is: { OR: productSearch(t) } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { createdAt: (d) => ({ createdAt: d }), status: (d) => ({ status: d }), readyAt: (d) => ({ readyAt: { sort: d, nulls: 'last' } }) }, [{ createdAt: 'desc' }, { id: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.outboundDispatch.findMany({ where, skip, take, orderBy, include: this.dispatchInclude }),
      this.prisma.outboundDispatch.count({ where }),
    ]);
    return paged(items, total, q);
  }


  private async mustDispatch(id: string) {
    const d = await this.prisma.outboundDispatch.findUnique({ where: { id }, include: this.dispatchInclude });
    if (!d) throw new NotFoundException('درخواست خروج زیرانبار یافت نشد');
    return d;
  }

  async getDispatch(id: string, user: AuthenticatedUser) {
    const d = await this.mustDispatch(id);
    if (!this.wa.isManager(user) && d.warehouse.keeperId !== user.id) throw new ForbiddenException('دسترسی مجاز نیست');
    return d;
  }

  async approve(id: string, user: AuthenticatedUser) {
    const d = await this.mustDispatch(id);
    await this.wa.assertKeeperOrManager(user, d.warehouseId);
    if (d.status !== OutboundDispatchStatus.PENDING_KEEPER) throw new ConflictException('وضعیت اجازه این عملیات را نمی‌دهد');
    await this.wa.assertUnlocked([d.warehouseId]);
    return this.prisma.outboundDispatch.update({
      where: { id }, data: { status: OutboundDispatchStatus.PREPARING, approvedById: user.id, approvedAt: new Date() }, include: this.dispatchInclude,
    });
  }

  async reject(id: string, reason: string, user: AuthenticatedUser) {
    const d = await this.mustDispatch(id);
    await this.wa.assertKeeperOrManager(user, d.warehouseId);
    if (d.status !== OutboundDispatchStatus.PENDING_KEEPER) throw new ConflictException('وضعیت اجازه این عملیات را نمی‌دهد');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.outboundDispatch.update({ where: { id }, data: { status: OutboundDispatchStatus.REJECTED, rejectReason: reason }, include: this.dispatchInclude });
      await this.refreshRequestStatus(tx, d.requestId);
      return u;
    });
    const managers = await this.access.userIdsWithPermission('warehouses', 'manage');
    await this.notifications.notifyUsers(managers, {
      type: 'OUTBOUND_DISPATCH_REJECTED', category: 'WAREHOUSE', title: 'انباردار درخواست خروج را رد کرد',
      body: `درخواست ${d.request.number} توسط انباردار «${d.warehouse.name}» رد شد: ${reason}. زیرانبار دیگری انتخاب کنید.`,
      entityType: 'OutboundRequest', entityId: d.requestId, actorId: user.id,
    });
    return updated;
  }

  // ═════════ inspection video ═════════
  async uploadVideo(id: string, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('فایل ویدیو ارسال نشده است');
    const d = await this.mustDispatch(id);
    await this.wa.assertKeeperOrManager(user, d.warehouseId);
    if (d.status !== OutboundDispatchStatus.PREPARING) throw new ConflictException('ویدیو فقط در مرحله «آماده‌سازی» قابل بارگذاری است');
    const ext = VIDEO_EXT[file.mimetype];
    if (!ext || !hasVideoSignature(file.mimetype, file.buffer)) throw new BadRequestException('ویدیو باید MP4، WebM یا MOV باشد');
    if (file.size > MAX_DISPATCH_VIDEO_SIZE) throw new BadRequestException('حجم ویدیو نباید بیشتر از ۵۰ مگابایت باشد (ویدیوی کوتاه)');

    const dir = join(process.cwd(), 'uploads', 'outbound-videos');
    await mkdir(dir, { recursive: true });
    const key = `${randomUUID()}${ext}`;
    await writeFile(join(dir, key), file.buffer, { flag: 'wx' });
    const updated = await this.prisma.outboundDispatch.update({
      where: { id }, data: { videoStorageKey: key, videoMimeType: file.mimetype, videoOriginalName: file.originalname, preparedAt: new Date() }, include: this.dispatchInclude,
    });
    if (d.videoStorageKey) await unlink(join(dir, d.videoStorageKey)).catch(() => undefined);
    return updated;
  }

  async streamVideo(id: string, user: AuthenticatedUser) {
    const d = await this.getDispatch(id, user);
    if (!d.videoStorageKey) throw new NotFoundException('ویدیویی ثبت نشده است');
    const path = join(process.cwd(), 'uploads', 'outbound-videos', d.videoStorageKey);
    return new StreamableFile(createReadStream(path), { type: d.videoMimeType ?? 'video/mp4', disposition: `inline; filename="dispatch-${id}"` });
  }

  // ═════════ ready for delivery (stock leaves the warehouse here) ═════════
  async markReady(id: string, dto: MarkReadyDto, user: AuthenticatedUser) {
    const d = await this.mustDispatch(id);
    await this.wa.assertKeeperOrManager(user, d.warehouseId);
    if (d.status !== OutboundDispatchStatus.PREPARING) throw new ConflictException('وضعیت اجازه این عملیات را نمی‌دهد');
    if (!d.videoStorageKey) throw new BadRequestException('ابتدا ویدیوی تست و بررسی کالا را بارگذاری کنید');

    if (dto.deliveryType === DeliveryType.IN_PERSON && !dto.receiverPhone?.trim()) throw new BadRequestException('شماره گیرنده برای تحویل حضوری الزامی است');
    if (dto.deliveryType === DeliveryType.FREIGHT) {
      if (!dto.transportSupplierId) throw new BadRequestException('تامین‌کننده حمل‌ونقل برای باربری الزامی است');
      const ts = await this.prisma.supplier.findUnique({ where: { id: dto.transportSupplierId } });
      if (!ts || !ts.isActive || ts.kind !== SupplierKind.TRANSPORT) throw new BadRequestException('تامین‌کننده حمل‌ونقل نامعتبر است');
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await this.wa.assertUnlocked([d.warehouseId], tx);
        const allPicks: any[] = [];
        for (const line of d.lines) {
          const manual = dto.picks?.filter((p) => p.productId === line.productId);
          const picks = await this.stock.allocate(tx, d.warehouseId, line.productId, line.quantity, manual?.length ? manual : undefined);
          await this.stock.deduct(tx, picks);
          allPicks.push(...picks);
        }
        const invoice = await this.invoices.create(tx, {
          type: WarehouseInvoiceType.ISSUE, warehouseId: d.warehouseId, refType: 'OUTBOUND_DISPATCH', refId: d.id, issuedById: user.id,
          notes: `درخواست خروج ${d.request.number} / سفارش ${d.request.saleOrderNumber ?? ''}`,
          lines: allPicks.map((p) => ({ productId: p.productId, lotNumber: p.lotNumber, serialNumber: p.serialNumber, manufactureDate: p.manufactureDate, expiryDate: p.expiryDate, quantity: p.quantity })),
        });
        return tx.outboundDispatch.update({
          where: { id },
          data: {
            status: OutboundDispatchStatus.READY_FOR_DELIVERY, readyAt: new Date(), deliveryType: dto.deliveryType,
            receiverName: dto.receiverName, receiverPhone: dto.receiverPhone, transportSupplierId: dto.transportSupplierId, transportNote: dto.transportNote,
            invoiceId: invoice.id,
            pickedItems: allPicks.map((p) => ({ productId: p.productId, lotNumber: p.lotNumber, serialNumber: p.serialNumber, quantity: p.quantity })),
          },
          include: this.dispatchInclude,
        });
      },
      { timeout: 30000, maxWait: 10000 },
    );

    const managers = await this.access.userIdsWithPermission('warehouses', 'manage');
    const where = dto.deliveryType === DeliveryType.IN_PERSON ? 'تحویل حضوری'
      : dto.deliveryType === DeliveryType.FREIGHT ? 'ارسال با باربری' : 'ارسال به بخش حمل‌ونقل داخلی';
    await this.notifications.notifyUsers(managers, {
      type: 'OUTBOUND_READY_FOR_DELIVERY', category: 'WAREHOUSE', title: 'کالا آماده تحویل است',
      body: `کالای درخواست ${d.request.number} از انبار «${d.warehouse.name}» خارج و آماده تحویل است (${where}).`,
      entityType: 'OutboundDispatch', entityId: id, actorId: user.id,
    });
    return updated;
  }

  async deliver(id: string, user: AuthenticatedUser) {
    const d = await this.mustDispatch(id);
    await this.wa.assertKeeperOrManager(user, d.warehouseId);
    if (d.status !== OutboundDispatchStatus.READY_FOR_DELIVERY) throw new ConflictException('وضعیت اجازه این عملیات را نمی‌دهد');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.outboundDispatch.update({
        where: { id }, data: { status: OutboundDispatchStatus.DELIVERED, deliveredAt: new Date(), deliveredById: user.id }, include: this.dispatchInclude,
      });
      await this.refreshRequestStatus(tx, d.requestId);
      return u;
    });
    const req = await this.prisma.outboundRequest.findUnique({ where: { id: d.requestId } });
    await this.notifications.notifyUsers([req?.requestedById].filter(Boolean) as string[], {
      type: 'OUTBOUND_DELIVERED', category: 'WAREHOUSE', title: 'کالا تحویل داده شد',
      body: `کالای درخواست ${d.request.number} تحویل داده شد.`, entityType: 'OutboundRequest', entityId: d.requestId, actorId: user.id,
    });
    return updated;
  }

  /** PENDING_ALLOCATION → IN_PROGRESS → COMPLETED, derived from dispatches. */
  private async refreshRequestStatus(tx: any, requestId: string) {
    const r = await tx.outboundRequest.findUnique({ where: { id: requestId }, include: { items: true, dispatches: { include: { lines: true } } } });
    if (!r || r.status === OutboundRequestStatus.CANCELLED) return;
    const active = r.dispatches.filter((d: any) => d.status !== OutboundDispatchStatus.REJECTED);
    let status: OutboundRequestStatus = OutboundRequestStatus.PENDING_ALLOCATION;
    if (active.length) {
      const fullyAllocated = r.items.every((i: any) => active.flatMap((d: any) => d.lines).filter((l: any) => l.productId === i.productId).reduce((s: number, l: any) => s + l.quantity, 0) >= i.quantity);
      const allDelivered = active.every((d: any) => d.status === OutboundDispatchStatus.DELIVERED);
      status = fullyAllocated && allDelivered ? OutboundRequestStatus.COMPLETED : OutboundRequestStatus.IN_PROGRESS;
    }
    if (status !== r.status) await tx.outboundRequest.update({ where: { id: requestId }, data: { status } });
  }
}
