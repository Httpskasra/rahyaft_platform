import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ci, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, supplierSearch, termConditions } from '../../common/dto/page-query.dto';
import { SupplierEntityType, SupplierKind } from '../../generated/prisma/enums';
import {
  CreateSupplierDto, QuerySuppliersDto, ReplaceSupplierProductsDto, SupplierProductInputDto, UpdateSupplierDto,
} from './dto/supplier.dto';

export function supplierDisplayName(s: {
  entityType: string; firstName?: string | null; lastName?: string | null; companyName?: string | null;
}) {
  return s.entityType === SupplierEntityType.COMPANY
    ? (s.companyName ?? '')
    : `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private decorate<T extends Record<string, any>>(s: T) {
    return { ...s, displayName: supplierDisplayName(s as any) };
  }

  private validateIdentity(dto: { entityType: SupplierEntityType; firstName?: string | null; lastName?: string | null; companyName?: string | null }) {
    if (dto.entityType === SupplierEntityType.PERSON) {
      if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
        throw new BadRequestException('نام و نام خانوادگی تامین‌کننده شخص الزامی است');
      }
    } else if (!dto.companyName?.trim()) {
      throw new BadRequestException('نام شرکت الزامی است');
    }
  }

  private async normalizeProducts(kind: SupplierKind, products: SupplierProductInputDto[] = []) {
    if (kind === SupplierKind.GOODS) {
      const ids = products.map((p) => p.productId);
      if (ids.some((id) => !id)) throw new BadRequestException('برای تامین‌کننده کالا، محصول (productId) الزامی است');
      if (new Set(ids).size !== ids.length) throw new BadRequestException('محصول تکراری در لیست وجود دارد');
      const found = await this.prisma.product.count({ where: { id: { in: ids as string[] } } });
      if (found !== ids.length) throw new BadRequestException('یک یا چند محصول یافت نشد');
      return products.map((p) => ({ productId: p.productId!, title: null as string | null, unitPrice: p.unitPrice ?? null, note: p.note ?? null }));
    }
    if (products.some((p) => !p.title?.trim())) {
      throw new BadRequestException('برای تامین‌کننده حمل‌ونقل، عنوان خدمت (title) الزامی است');
    }
    return products.map((p) => ({ productId: null as string | null, title: p.title!.trim(), unitPrice: p.unitPrice ?? null, note: p.note ?? null }));
  }

  async create(dto: CreateSupplierDto, userId: string) {
    this.validateIdentity(dto);
    const products = await this.normalizeProducts(dto.kind, dto.products);
    const { products: _p, ...data } = dto;
    const created = await this.prisma.supplier.create({
      data: { ...data, createdById: userId, products: { create: products } },
      include: { products: { include: { product: { select: { id: true, code: true, fullName: true } } } } },
    });
    return this.decorate(created);
  }

  async list(q: QuerySuppliersDto) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (!q.includeInactive) conditions.push({ isActive: true });
    if (q.kind) conditions.push({ kind: q.kind });
    if (q.entityType) conditions.push({ entityType: q.entityType });
    if (q.label) conditions.push({ label: q.label });
    if (q.productId) conditions.push({ products: { some: { productId: q.productId } } });
    if (q.scoreMin !== undefined || q.scoreMax !== undefined) {
      conditions.push({ score: { ...(q.scoreMin !== undefined ? { gte: q.scoreMin } : {}), ...(q.scoreMax !== undefined ? { lte: q.scoreMax } : {}) } });
    }
    const threshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    if (q.evaluationOverdue === true) conditions.push({ OR: [{ lastEvaluatedAt: null }, { lastEvaluatedAt: { lt: threshold } }] });
    if (q.evaluationOverdue === false) conditions.push({ lastEvaluatedAt: { gte: threshold } });
    if (q.hasEvaluation === true) conditions.push({ lastEvaluatedAt: { not: null } });
    if (q.hasEvaluation === false) conditions.push({ lastEvaluatedAt: null });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        ...supplierSearch(t),
        { address: ci(t) },
        { products: { some: { OR: [{ title: ci(t) }, { product: { is: { OR: productSearch(t) } } }] } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(
      q,
      {
        createdAt: (d) => ({ createdAt: d }), score: (d) => ({ score: { sort: d, nulls: 'last' } }),
        lastEvaluatedAt: (d) => ({ lastEvaluatedAt: { sort: d, nulls: 'last' } }),
        lastPurchaseAt: (d) => ({ lastPurchaseAt: { sort: d, nulls: 'last' } }),
        name: (d) => ({ companyName: { sort: d, nulls: 'last' } }), lastName: (d) => ({ lastName: { sort: d, nulls: 'last' } }),
      },
      [{ createdAt: 'desc' }, { id: 'desc' }],
    );
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, skip, take, orderBy, include: { _count: { select: { products: true } } } }),
      this.prisma.supplier.count({ where }),
    ]);
    return paged(items.map((s) => this.decorate(s)), total, q);
  }


  async get(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: { include: { product: { select: { id: true, code: true, fullName: true, brand: true, model: true } } } },
        evaluations: { orderBy: { evaluatedAt: 'desc' }, take: 5 },
      },
    });
    if (!s) throw new NotFoundException('تامین‌کننده یافت نشد');
    return this.decorate(s);
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تامین‌کننده یافت نشد');
    this.validateIdentity({ ...existing, ...dto } as any);
    const updated = await this.prisma.supplier.update({ where: { id }, data: dto });
    return this.decorate(updated);
  }

  async replaceProducts(id: string, dto: ReplaceSupplierProductsDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تامین‌کننده یافت نشد');
    const products = await this.normalizeProducts(existing.kind, dto.products);
    await this.prisma.$transaction([
      this.prisma.supplierProduct.deleteMany({ where: { supplierId: id } }),
      this.prisma.supplierProduct.createMany({ data: products.map((p) => ({ ...p, supplierId: id })) }),
    ]);
    return this.get(id);
  }

  /** Goods suppliers able to supply a product — used by the purchasing officer. */
  async byProduct(productId: string) {
    const rows = await this.prisma.supplierProduct.findMany({
      where: { productId, supplier: { isActive: true, kind: SupplierKind.GOODS } },
      include: { supplier: true },
    });
    return rows.map((r) => ({
      supplierId: r.supplierId,
      displayName: supplierDisplayName(r.supplier),
      entityType: r.supplier.entityType,
      label: r.supplier.label,
      score: r.supplier.score,
      unitPrice: r.unitPrice,
    }));
  }

  async remove(id: string) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { goodsOrders: true, transportOrders: true, outboundDispatches: true } } },
    });
    if (!s) throw new NotFoundException('تامین‌کننده یافت نشد');
    const used = s._count.goodsOrders + s._count.transportOrders + s._count.outboundDispatches;
    if (used > 0) {
      await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true, message: 'تامین‌کننده سابقه سفارش دارد و غیرفعال شد' };
    }
    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }

  async assertExists(id: string, kind?: SupplierKind) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('تامین‌کننده یافت نشد');
    if (kind && s.kind !== kind) throw new ConflictException('نوع تامین‌کننده مجاز نیست');
    return s;
  }
}
