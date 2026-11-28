import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ci, dateRange, orderByOf, pageArgs, paged, productSearch, searchTerms, termConditions } from '../../common/dto/page-query.dto';
import {
  CheckProductDto, CreateProductCategoryDto, CreateProductDto, CreateProductTypeDto, QueryProductsDto, UpdateProductDto,
} from './dto/product.dto';

export function buildProductName(
  typeName: string,
  categoryName: string,
  p: { definitionSuffix?: string | null; brand?: string | null; model?: string | null; grade?: string | null; extraPrefix?: string | null; color?: string | null },
) {
  return [typeName, categoryName, p.definitionSuffix, p.brand, p.model, p.grade, p.extraPrefix, p.color]
    .map((x) => (x ?? '').toString().trim())
    .filter(Boolean)
    .join(' ');
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────── types & categories ─────────
  listTypes() {
    return this.prisma.productType.findMany({
      orderBy: { code: 'asc' },
      include: { categories: { orderBy: { code: 'asc' } } },
    });
  }

  async createType(dto: CreateProductTypeDto) {
    const exists = await this.prisma.productType.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`کد نوع ${dto.code} قبلاً برای «${exists.name}» ثبت شده است`);
    return this.prisma.productType.create({ data: dto });
  }

  async renameType(id: string, name: string) {
    await this.mustType(id);
    return this.prisma.productType.update({ where: { id }, data: { name } });
  }

  async removeType(id: string) {
    await this.mustType(id);
    const used = await this.prisma.product.count({ where: { typeId: id } });
    if (used) throw new ConflictException('این نوع دارای محصول است و حذف نمی‌شود');
    await this.prisma.productCategory.deleteMany({ where: { typeId: id } });
    await this.prisma.productType.delete({ where: { id } });
    return { deleted: true };
  }

  async createCategory(typeId: string, dto: CreateProductCategoryDto) {
    await this.mustType(typeId);
    const exists = await this.prisma.productCategory.findUnique({ where: { typeId_code: { typeId, code: dto.code } } });
    if (exists) throw new ConflictException(`کد کتگوری ${dto.code} در این نوع قبلاً برای «${exists.name}» ثبت شده است`);
    return this.prisma.productCategory.create({ data: { typeId, ...dto } });
  }

  async renameCategory(id: string, name: string) {
    const c = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('کتگوری یافت نشد');
    return this.prisma.productCategory.update({ where: { id }, data: { name } });
  }

  async removeCategory(id: string) {
    const used = await this.prisma.product.count({ where: { categoryId: id } });
    if (used) throw new ConflictException('این کتگوری دارای محصول است و حذف نمی‌شود');
    await this.prisma.productCategory.delete({ where: { id } });
    return { deleted: true };
  }

  private async mustType(id: string) {
    const t = await this.prisma.productType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('نوع محصول یافت نشد');
    return t;
  }

  // ───────── products ─────────
  private async resolveStructure(typeId: string, categoryId: string) {
    const category = await this.prisma.productCategory.findUnique({ where: { id: categoryId }, include: { type: true } });
    if (!category || category.typeId !== typeId) throw new BadRequestException('کتگوری متعلق به این نوع نیست');
    return { type: category.type, category };
  }

  /** Live duplicate check — returns warnings instead of throwing so the UI can alert the user while defining. */
  async check(dto: CheckProductDto) {
    const { type, category } = await this.resolveStructure(dto.typeId, dto.categoryId);
    const code = `${type.code}${category.code}${dto.itemCode}`;
    const fullName = buildProductName(type.name, category.name, dto);
    const notSelf = dto.excludeId ? { id: { not: dto.excludeId } } : {};
    const [byCode, byName] = await Promise.all([
      this.prisma.product.findFirst({ where: { code, ...notSelf }, select: { id: true, code: true, fullName: true } }),
      this.prisma.product.findFirst({ where: { fullName, ...notSelf }, select: { id: true, code: true, fullName: true } }),
    ]);
    return {
      code, fullName,
      codeTaken: !!byCode, nameTaken: !!byName,
      conflicts: { byCode, byName },
      warnings: [
        ...(byCode ? [`کد ${code} قبلاً برای «${byCode.fullName}» ثبت شده است`] : []),
        ...(byName ? [`محصولی با همین نام قبلاً با کد ${byName.code} ثبت شده است`] : []),
      ],
    };
  }

  async create(dto: CreateProductDto, userId: string) {
    const check = await this.check(dto);
    if (check.codeTaken || check.nameTaken) throw new ConflictException({ message: check.warnings.join(' | '), ...check });
    const { type, category } = await this.resolveStructure(dto.typeId, dto.categoryId);
    return this.prisma.product.create({
      data: {
        code: check.code, typeId: type.id, categoryId: category.id, itemCode: dto.itemCode,
        definitionSuffix: dto.definitionSuffix, brand: dto.brand, model: dto.model, grade: dto.grade,
        extraPrefix: dto.extraPrefix, color: dto.color, fullName: check.fullName,
        trackSerial: dto.trackSerial ?? false, createdById: userId,
      },
      include: { type: true, category: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const p = await this.get(id);
    const parts = {
      definitionSuffix: dto.definitionSuffix ?? p.definitionSuffix,
      brand: dto.brand ?? p.brand, model: dto.model ?? p.model, grade: dto.grade ?? p.grade,
      extraPrefix: dto.extraPrefix ?? p.extraPrefix, color: dto.color ?? p.color,
    };
    const fullName = buildProductName(p.type.name, p.category.name, parts);
    if (fullName !== p.fullName) {
      const dup = await this.prisma.product.findFirst({ where: { fullName, id: { not: id } } });
      if (dup) throw new ConflictException(`محصولی با همین نام قبلاً با کد ${dup.code} ثبت شده است`);
    }
    return this.prisma.product.update({
      where: { id },
      data: { ...parts, fullName, ...(dto.trackSerial !== undefined ? { trackSerial: dto.trackSerial } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) },
      include: { type: true, category: true },
    });
  }

  async get(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: { type: true, category: true } });
    if (!p) throw new NotFoundException('محصول یافت نشد');
    return p;
  }

  async list(q: QueryProductsDto) {
    const { skip, take } = pageArgs(q);
    const conditions: any[] = [];
    if (!q.includeInactive) conditions.push({ isActive: true });
    if (q.typeId) conditions.push({ typeId: q.typeId });
    if (q.categoryId) conditions.push({ categoryId: q.categoryId });
    if (q.brand) conditions.push({ brand: ci(q.brand) });
    if (q.model) conditions.push({ model: ci(q.model) });
    if (q.color) conditions.push({ color: ci(q.color) });
    if (q.grade) conditions.push({ grade: ci(q.grade) });
    if (q.trackSerial !== undefined) conditions.push({ trackSerial: q.trackSerial });
    if (q.priceReviewNeeded !== undefined) conditions.push({ priceReviewNeeded: q.priceReviewNeeded });
    if (q.hasPrice === true) conditions.push({ currentPrice: { not: null } });
    if (q.hasPrice === false) conditions.push({ currentPrice: null });
    if (q.priceMin !== undefined || q.priceMax !== undefined) {
      conditions.push({ currentPrice: { ...(q.priceMin !== undefined ? { gte: q.priceMin } : {}), ...(q.priceMax !== undefined ? { lte: q.priceMax } : {}) } });
    }
    if (q.inStock === true) conditions.push({ stockItems: { some: { quantity: { gt: 0 } } } });
    if (q.inStock === false) conditions.push({ stockItems: { none: { quantity: { gt: 0 } } } });
    const range = dateRange('createdAt', q.from, q.to);
    if (range) conditions.push(range);
    conditions.push(
      ...termConditions(searchTerms(q), (t) => [
        ...productSearch(t), { extraPrefix: ci(t) },
        { type: { is: { name: ci(t) } } }, { category: { is: { name: ci(t) } } },
      ]),
    );
    const where = conditions.length ? { AND: conditions } : {};
    const orderBy = orderByOf(
      q,
      {
        code: (d) => ({ code: d }), fullName: (d) => ({ fullName: d }), createdAt: (d) => ({ createdAt: d }),
        currentPrice: (d) => ({ currentPrice: { sort: d, nulls: 'last' } }),
        lastPurchasePrice: (d) => ({ lastPurchasePrice: { sort: d, nulls: 'last' } }),
      },
      [{ code: 'asc' }],
    );
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, orderBy, include: { type: true, category: true } }),
      this.prisma.product.count({ where }),
    ]);
    return paged(items, total, q);
  }


  async remove(id: string) {
    await this.get(id);
    const [stock, orders, requests] = await Promise.all([
      this.prisma.stockItem.count({ where: { productId: id } }),
      this.prisma.purchaseOrderItem.count({ where: { productId: id } }),
      this.prisma.purchaseRequestItem.count({ where: { productId: id } }),
    ]);
    if (stock + orders + requests > 0) {
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true, message: 'محصول سابقه دارد و غیرفعال شد' };
    }
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }
}
