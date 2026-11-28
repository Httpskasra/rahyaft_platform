import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../../common/shared/access.service';
import { SequenceService } from '../../common/shared/sequence.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ci, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, supplierSearch, termConditions } from '../../common/dto/page-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import {
  DeliveryMode, PurchaseOrderStatus, PurchaseRequestStatus, SupplierKind, SupplierLabel,
} from '../../generated/prisma/enums';
import { supplierDisplayName } from '../suppliers/suppliers.service';
import {
  ChangeOrderStatusDto, CreatePurchaseOrderDto, CreatePurchaseRequestDto, QueryOrdersDto, QueryRequestsDto,
  UpdatePurchaseOrderDto,
} from './dto/purchasing.dto';

const ORDER_TRANSITIONS: Record<string, PurchaseOrderStatus[]> = {
  INITIAL: [PurchaseOrderStatus.FOLLOW_UP, PurchaseOrderStatus.CANCELLED],
  FOLLOW_UP: [PurchaseOrderStatus.PURCHASED, PurchaseOrderStatus.CANCELLED],
};

@Injectable()
export class PurchasingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
  ) {}

  // ═════════ requests ═════════
  async createRequest(dto: CreatePurchaseRequestDto, user: AuthenticatedUser) {
    const ids = dto.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('محصول تکراری در درخواست وجود دارد');
    const count = await this.prisma.product.count({ where: { id: { in: ids }, isActive: true } });
    if (count !== ids.length) throw new BadRequestException('یک یا چند محصول نامعتبر یا غیرفعال است');

    const request = await this.prisma.$transaction(async (tx) => {
      const number = await this.sequence.next('PR', tx);
      return tx.purchaseRequest.create({
        data: {
          number, requesterId: user.id, neededBy: dto.neededBy ? new Date(dto.neededBy) : null, notes: dto.notes,
          items: { create: dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note })) },
        },
        include: { items: { include: { product: { select: { id: true, code: true, fullName: true } } } } },
      });
    });

    const approvers = await this.access.userIdsWithPermission('purchase-requests', 'approve');
    await this.notifications.notifyUsers(approvers, {
      type: 'PURCHASE_REQUEST_CREATED', category: 'COMMERCE', title: 'درخواست کالای جدید',
      body: `درخواست ${request.number} توسط ${user.name} ثبت شد و منتظر تایید است.`,
      entityType: 'PurchaseRequest', entityId: request.id, actorId: user.id,
    });
    return request;
  }

  async listRequests(q: QueryRequestsDto, user: AuthenticatedUser) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (!this.access.hasPermission(user, 'purchase-requests', 'read')) conditions.push({ requesterId: user.id });
    if (q.status) conditions.push({ status: q.status });
    if (q.requesterId) conditions.push({ requesterId: q.requesterId });
    if (q.productId) conditions.push({ items: { some: { productId: q.productId } } });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { number: ci(t) }, { notes: ci(t) }, { reviewNote: ci(t) },
        { requester: { is: { name: ci(t) } } },
        { items: { some: { product: { is: { OR: productSearch(t) } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(q, { createdAt: (d) => ({ createdAt: d }), number: (d) => ({ number: d }), status: (d) => ({ status: d }), neededBy: (d) => ({ neededBy: { sort: d, nulls: 'last' } }) }, [{ createdAt: 'desc' }, { id: 'desc' }]);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequest.findMany({
        where, skip, take, orderBy,
        include: { requester: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return paged(items, total, q);
  }


  async getRequest(id: string, user: AuthenticatedUser) {
    const r = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, fullName: true } }, orderItems: { select: { quantity: true, order: { select: { id: true, number: true, status: true } } } } } },
        orders: { select: { id: true, number: true, status: true, supplierId: true } },
      },
    });
    if (!r) throw new NotFoundException('درخواست یافت نشد');
    if (r.requesterId !== user.id && !this.access.hasPermission(user, 'purchase-requests', 'read')) {
      throw new ForbiddenException('دسترسی به این درخواست مجاز نیست');
    }
    return r;
  }

  async approveRequest(id: string, note: string | undefined, user: AuthenticatedUser) {
    const r = await this.mustRequest(id, PurchaseRequestStatus.PENDING_APPROVAL);
    const updated = await this.prisma.purchaseRequest.update({
      where: { id }, data: { status: PurchaseRequestStatus.APPROVED, reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
    });
    const buyers = await this.access.userIdsWithPermission('purchase-orders', 'create');
    await this.notifications.notifyUsers(buyers, {
      type: 'PURCHASE_REQUEST_APPROVED', category: 'COMMERCE', title: 'درخواست کالا برای خرید تایید شد',
      body: `درخواست ${r.number} تایید شد؛ لطفاً تامین‌کننده را انتخاب و سفارش ثبت کنید.`,
      entityType: 'PurchaseRequest', entityId: id, actorId: user.id,
    });
    await this.notifications.notifyUsers([r.requesterId], {
      type: 'PURCHASE_REQUEST_APPROVED', category: 'COMMERCE', title: 'درخواست شما تایید شد',
      body: `درخواست ${r.number} توسط مدیر بازرگانی تایید شد.`, entityType: 'PurchaseRequest', entityId: id, actorId: user.id,
    });
    return updated;
  }

  async rejectRequest(id: string, note: string, user: AuthenticatedUser) {
    const r = await this.mustRequest(id, PurchaseRequestStatus.PENDING_APPROVAL);
    const updated = await this.prisma.purchaseRequest.update({
      where: { id }, data: { status: PurchaseRequestStatus.REJECTED, reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
    });
    await this.notifications.notifyUsers([r.requesterId], {
      type: 'PURCHASE_REQUEST_REJECTED', category: 'COMMERCE', title: 'درخواست شما رد شد',
      body: `درخواست ${r.number} رد شد: ${note}`, entityType: 'PurchaseRequest', entityId: id, actorId: user.id,
    });
    return updated;
  }

  async cancelRequest(id: string, user: AuthenticatedUser) {
    const r = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('درخواست یافت نشد');
    const isOwner = r.requesterId === user.id;
    if (!isOwner && !this.access.hasPermission(user, 'purchase-requests', 'approve')) throw new ForbiddenException();
    if (r.status !== PurchaseRequestStatus.PENDING_APPROVAL) throw new ConflictException('فقط درخواست‌های در انتظار تایید قابل لغو هستند');
    return this.prisma.purchaseRequest.update({ where: { id }, data: { status: PurchaseRequestStatus.CANCELLED } });
  }

  private async mustRequest(id: string, status: PurchaseRequestStatus) {
    const r = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('درخواست یافت نشد');
    if (r.status !== status) throw new ConflictException('وضعیت درخواست اجازه این عملیات را نمی‌دهد');
    return r;
  }

  // ═════════ orderable items (for the purchasing officer) ═════════
  async orderable() {
    const requests = await this.prisma.purchaseRequest.findMany({
      where: { status: PurchaseRequestStatus.APPROVED }, orderBy: { createdAt: 'asc' },
      include: {
        requester: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, fullName: true } }, orderItems: { where: { order: { status: { not: PurchaseOrderStatus.CANCELLED } } }, select: { quantity: true } } } },
      },
    });
    const productIds = [...new Set(requests.flatMap((r) => r.items.map((i) => i.productId)))];
    const sp = await this.prisma.supplierProduct.findMany({
      where: { productId: { in: productIds }, supplier: { isActive: true, kind: SupplierKind.GOODS } },
      include: { supplier: true },
    });
    return requests.map((r) => ({
      id: r.id, number: r.number, requester: r.requester, neededBy: r.neededBy, notes: r.notes,
      items: r.items.map((i) => {
        const ordered = i.orderItems.reduce((s, o) => s + o.quantity, 0);
        return {
          requestItemId: i.id, product: i.product, quantity: i.quantity, orderedQuantity: ordered, remaining: i.quantity - ordered,
          suppliers: sp.filter((x) => x.productId === i.productId).map((x) => ({
            supplierId: x.supplierId, displayName: supplierDisplayName(x.supplier), label: x.supplier.label,
            score: x.supplier.score, unitPrice: x.unitPrice,
          })),
        };
      }).filter((i) => i.remaining > 0),
    })).filter((r) => r.items.length);
  }

  // ═════════ orders ═════════
  async createOrder(dto: CreatePurchaseOrderDto, user: AuthenticatedUser) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId }, include: { products: true } });
    if (!supplier || !supplier.isActive || supplier.kind !== SupplierKind.GOODS) {
      throw new BadRequestException('تامین‌کننده کالای فعال یافت نشد');
    }
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse || !warehouse.isActive) throw new BadRequestException('انبار مقصد نامعتبر است');
    if (warehouse.parentId === null) throw new BadRequestException('انبار مقصد باید یکی از زیرانبارها باشد');
    if (dto.deliveryMode === DeliveryMode.TRANSPORT_SUPPLIER) {
      if (!dto.transportSupplierId) throw new BadRequestException('برای ارسال با تامین‌کننده حمل، انتخاب تامین‌کننده حمل الزامی است');
      const ts = await this.prisma.supplier.findUnique({ where: { id: dto.transportSupplierId } });
      if (!ts || !ts.isActive || ts.kind !== SupplierKind.TRANSPORT) throw new BadRequestException('تامین‌کننده حمل‌ونقل نامعتبر است');
    }

    let request: any = null;
    if (dto.requestId) {
      request = await this.prisma.purchaseRequest.findUnique({ where: { id: dto.requestId }, include: { items: { include: { orderItems: { where: { order: { status: { not: PurchaseOrderStatus.CANCELLED } } } } } } } });
      if (!request) throw new NotFoundException('درخواست یافت نشد');
      if (request.status !== PurchaseRequestStatus.APPROVED) throw new ConflictException('درخواست در وضعیت تایید شده نیست');
    }

    const lines: { productId: string; requestItemId: string | null; quantity: number; unitPrice: number | null }[] = [];
    for (const item of dto.items) {
      let productId = item.productId;
      let requestItemId: string | null = null;
      if (item.requestItemId) {
        const ri = request?.items.find((x: any) => x.id === item.requestItemId);
        if (!ri) throw new BadRequestException('آیتم درخواست متعلق به این درخواست نیست');
        const ordered = ri.orderItems.reduce((s: number, o: any) => s + o.quantity, 0);
        if (item.quantity > ri.quantity - ordered) throw new BadRequestException('تعداد سفارش از باقیمانده درخواست بیشتر است');
        productId = ri.productId;
        requestItemId = ri.id;
      }
      if (!productId) throw new BadRequestException('productId یا requestItemId الزامی است');
      if (!supplier.products.some((p) => p.productId === productId)) {
        throw new BadRequestException('این تامین‌کننده برای یکی از محصولات انتخابی تعریف نشده است');
      }
      lines.push({ productId, requestItemId, quantity: item.quantity, unitPrice: item.unitPrice ?? null });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const number = await this.sequence.next('PO', tx);
      const created = await tx.purchaseOrder.create({
        data: {
          number, requestId: dto.requestId, requesterId: request?.requesterId ?? null, buyerId: user.id,
          supplierId: dto.supplierId, warehouseId: dto.warehouseId, paymentMethod: dto.paymentMethod,
          expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
          deliveryMode: dto.deliveryMode, transportSupplierId: dto.transportSupplierId, transportCost: dto.transportCost, notes: dto.notes,
          items: { create: lines },
          statusLogs: { create: { toStatus: PurchaseOrderStatus.INITIAL, userId: user.id } },
        },
        include: { items: { include: { product: { select: { id: true, code: true, fullName: true } } } } },
      });
      if (request) {
        const fresh = await tx.purchaseRequestItem.findMany({
          where: { requestId: request.id },
          include: { orderItems: { where: { order: { status: { not: PurchaseOrderStatus.CANCELLED } } }, select: { quantity: true } } },
        });
        if (fresh.every((i) => i.orderItems.reduce((s, o) => s + o.quantity, 0) >= i.quantity)) {
          await tx.purchaseRequest.update({ where: { id: request.id }, data: { status: PurchaseRequestStatus.ORDERED } });
        }
      }
      return created;
    });

    const toNotify = [warehouse.keeperId, request?.requesterId].filter(Boolean) as string[];
    await this.notifications.notifyUsers(toNotify, {
      type: 'PURCHASE_ORDER_CREATED', category: 'COMMERCE', title: 'سفارش خرید ثبت شد',
      body: `سفارش ${order.number} برای انبار ${warehouse.name} ثبت شد.`,
      entityType: 'PurchaseOrder', entityId: order.id, actorId: user.id,
    });
    const warnings: string[] = [];
    if (supplier.label === SupplierLabel.BLACK) warnings.push('هشدار: لیبل این تامین‌کننده مشکی است');
    return { ...order, warnings };
  }

  async listOrders(q: QueryOrdersDto, user: AuthenticatedUser) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (!this.access.hasPermission(user, 'purchase-orders', 'read')) conditions.push({ requesterId: user.id });
    for (const key of ['status', 'supplierId', 'warehouseId', 'requesterId', 'buyerId', 'transportSupplierId', 'paymentMethod', 'deliveryMode'] as const) {
      if ((q as any)[key]) conditions.push({ [key]: (q as any)[key] });
    }
    if (q.productId) conditions.push({ items: { some: { productId: q.productId } } });
    const orderedRange = dateRange('orderedAt', q.from, q.to);
    if (orderedRange) conditions.push(orderedRange);
    const deliveryRange = dateRange('expectedDeliveryAt', q.deliveryFrom, q.deliveryTo);
    if (deliveryRange) conditions.push(deliveryRange);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        { number: ci(t) }, { notes: ci(t) },
        { supplier: { is: { OR: supplierSearch(t) } } },
        { transportSupplier: { is: { OR: supplierSearch(t) } } },
        { requester: { is: { name: ci(t) } } }, { buyer: { is: { name: ci(t) } } },
        { warehouse: { is: { OR: [{ name: ci(t) }, { number: ci(t) }] } } },
        { items: { some: { product: { is: { OR: productSearch(t) } } } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(
      q,
      {
        orderedAt: (d) => ({ orderedAt: d }), createdAt: (d) => ({ createdAt: d }), number: (d) => ({ number: d }), status: (d) => ({ status: d }),
        expectedDeliveryAt: (d) => ({ expectedDeliveryAt: { sort: d, nulls: 'last' } }),
      },
      [{ createdAt: 'desc' }, { id: 'desc' }],
    );
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where, skip, take, orderBy,
        include: {
          supplier: { select: { id: true, entityType: true, firstName: true, lastName: true, companyName: true, label: true } },
          warehouse: { select: { id: true, name: true, number: true } },
          requester: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paged(items.map((o) => ({ ...o, supplierName: supplierDisplayName(o.supplier) })), total, q);
  }


  async getOrder(id: string, user: AuthenticatedUser) {
    const o = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true, transportSupplier: true,
        warehouse: { select: { id: true, name: true, number: true, keeperId: true } },
        requester: { select: { id: true, name: true } }, buyer: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, code: true, fullName: true } } } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!o) throw new NotFoundException('سفارش یافت نشد');
    if (o.requesterId !== user.id && !this.access.hasPermission(user, 'purchase-orders', 'read')) throw new ForbiddenException();
    return { ...o, supplierName: supplierDisplayName(o.supplier) };
  }

  async updateOrder(id: string, dto: UpdatePurchaseOrderDto) {
    const o = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('سفارش یافت نشد');
    if (o.status !== PurchaseOrderStatus.INITIAL && o.status !== PurchaseOrderStatus.FOLLOW_UP) {
      throw new ConflictException('ویرایش سفارش فقط تا قبل از خرید ممکن است');
    }
    if (dto.warehouseId) {
      const w = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
      if (!w || !w.isActive || w.parentId === null) throw new BadRequestException('انبار مقصد باید یکی از زیرانبارهای فعال باشد');
    }
    const mode = dto.deliveryMode ?? o.deliveryMode;
    const transportId = dto.transportSupplierId ?? o.transportSupplierId;
    if (mode === DeliveryMode.TRANSPORT_SUPPLIER && !transportId) throw new BadRequestException('تامین‌کننده حمل الزامی است');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.expectedDeliveryAt ? { expectedDeliveryAt: new Date(dto.expectedDeliveryAt) } : {}),
        paymentMethod: dto.paymentMethod, notes: dto.notes, warehouseId: dto.warehouseId, deliveryMode: dto.deliveryMode,
        transportSupplierId: dto.transportSupplierId, transportCost: dto.transportCost,
      },
    });
  }

  async changeStatus(id: string, dto: ChangeOrderStatusDto, user: AuthenticatedUser) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: { include: { product: true } }, warehouse: true, supplier: true } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) throw new ConflictException(`تغییر وضعیت از ${order.status} به ${dto.status} مجاز نیست`);

    if (dto.status === PurchaseOrderStatus.PURCHASED) {
      const priceById = new Map((dto.prices ?? []).map((p) => [p.itemId, p.unitPrice]));
      for (const it of order.items) {
        const price = priceById.get(it.id) ?? (it.unitPrice !== null ? Number(it.unitPrice) : null);
        if (price === null) throw new BadRequestException(`قیمت خرید «${it.product.fullName}» الزامی است`);
        priceById.set(it.id, price);
      }
      await this.prisma.$transaction(async (tx) => {
        const priceChanged: string[] = [];
        for (const it of order.items) {
          const price = priceById.get(it.id)!;
          await tx.purchaseOrderItem.update({ where: { id: it.id }, data: { unitPrice: price } });
          const prev = it.product.lastPurchasePrice !== null ? Number(it.product.lastPurchasePrice) : null;
          const changed = prev === null || prev !== price;
          await tx.product.update({
            where: { id: it.productId },
            data: { lastPurchasePrice: price, lastPurchaseAt: new Date(), ...(changed ? { priceReviewNeeded: true } : {}) },
          });
          if (changed) priceChanged.push(it.product.fullName);
        }
        await tx.purchaseOrder.update({ where: { id }, data: { status: dto.status, purchasedAt: new Date() } });
        await tx.purchaseOrderStatusLog.create({ data: { orderId: id, fromStatus: order.status, toStatus: dto.status, userId: user.id, note: dto.note } });
        // periodic evaluation becomes due after every purchase
        await tx.supplier.update({ where: { id: order.supplierId }, data: { lastPurchaseAt: new Date(), periodicDueAt: new Date(), lastReminderAt: new Date() } });
        (order as any)._priceChanged = priceChanged;
      });

      const priceChanged: string[] = (order as any)._priceChanged ?? [];
      if (priceChanged.length) {
        const pricers = await this.access.userIdsWithPermission('pricing', 'approve');
        await this.notifications.notifyUsers(pricers, {
          type: 'PRODUCT_PRICE_REVIEW_NEEDED', category: 'COMMERCE', title: 'نیاز به قیمت‌گذاری مجدد',
          body: `قیمت خرید تغییر کرد: ${priceChanged.slice(0, 5).join('، ')}${priceChanged.length > 5 ? ' و ...' : ''}`,
          entityType: 'PurchaseOrder', entityId: id, actorId: user.id,
        });
      }
      const evaluators = await this.access.userIdsWithPermission('supplier-evaluations', 'create');
      await this.notifications.notifyUsers(evaluators, {
        type: 'SUPPLIER_PERIODIC_EVALUATION_DUE', category: 'COMMERCE', title: 'ارزیابی دوره‌ای تامین‌کننده',
        body: `پس از خرید سفارش ${order.number}، ارزیابی دوره‌ای «${supplierDisplayName(order.supplier)}» را ثبت کنید.`,
        entityType: 'Supplier', entityId: order.supplierId, actorId: user.id,
      });
      await this.notifications.notifyUsers([order.warehouse.keeperId, order.requesterId].filter(Boolean) as string[], {
        type: 'PURCHASE_ORDER_PURCHASED', category: 'COMMERCE', title: 'سفارش خریداری شد',
        body: `سفارش ${order.number} خریداری شد و در انتظار ورود به انبار ${order.warehouse.name} است.`,
        entityType: 'PurchaseOrder', entityId: id, actorId: user.id,
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({ where: { id }, data: { status: dto.status } });
        await tx.purchaseOrderStatusLog.create({ data: { orderId: id, fromStatus: order.status, toStatus: dto.status, userId: user.id, note: dto.note } });
        if (dto.status === PurchaseOrderStatus.CANCELLED && order.requestId) {
          await tx.purchaseRequest.updateMany({ where: { id: order.requestId, status: PurchaseRequestStatus.ORDERED }, data: { status: PurchaseRequestStatus.APPROVED } });
        }
      });
    }
    return this.getOrder(id, user);
  }

  // ═════════ hooks used by the warehouse module ═════════
  /** Orders waiting to be received (status PURCHASED) for the given warehouses. */
  async incomingOrders(warehouseIds: string[] | null) {
    return this.prisma.purchaseOrder.findMany({
      where: { status: PurchaseOrderStatus.PURCHASED, ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}) },
      include: {
        supplier: { select: { id: true, entityType: true, firstName: true, lastName: true, companyName: true } },
        warehouse: { select: { id: true, name: true, number: true } },
        items: { include: { product: { select: { id: true, code: true, fullName: true, trackSerial: true } } } },
      },
      orderBy: { purchasedAt: 'asc' },
    });
  }

  /**
   * Records received quantities against an order inside the caller's transaction
   * and auto-finalizes the order once everything has arrived.
   */
  async applyReceipt(tx: any, orderId: string, received: { productId: string; quantity: number }[], actorId: string) {
    const order = await tx.purchaseOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    if (order.status !== PurchaseOrderStatus.PURCHASED) {
      throw new ConflictException('ورود کالا فقط برای سفارش در وضعیت «خریداری شده» امکان‌پذیر است');
    }
    const perProduct = new Map<string, number>();
    for (const r of received) perProduct.set(r.productId, (perProduct.get(r.productId) ?? 0) + r.quantity);
    for (const [productId, qty] of perProduct) {
      const item = order.items.find((i: any) => i.productId === productId);
      if (!item) throw new BadRequestException('یکی از اقلام در این سفارش وجود ندارد');
      if (item.receivedQuantity + qty > item.quantity) {
        throw new BadRequestException('تعداد دریافتی از تعداد سفارش‌شده بیشتر است');
      }
      await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: { increment: qty } } });
      item.receivedQuantity += qty;
    }
    const done = order.items.every((i: any) => i.receivedQuantity >= i.quantity);
    if (done) {
      await tx.purchaseOrder.update({ where: { id: orderId }, data: { status: PurchaseOrderStatus.FINALIZED, finalizedAt: new Date() } });
      await tx.purchaseOrderStatusLog.create({
        data: { orderId, fromStatus: PurchaseOrderStatus.PURCHASED, toStatus: PurchaseOrderStatus.FINALIZED, userId: actorId, note: 'ثبت خودکار پس از ورود کامل به انبار' },
      });
    }
    return { finalized: done, order };
  }
}
