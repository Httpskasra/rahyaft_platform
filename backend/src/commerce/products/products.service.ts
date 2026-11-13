import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductCategoryDto,
  CreateProductDto,
  CreateProductTypeDto,
  QueryProductDto,
  UpdateProductCategoryDto,
  UpdateProductDto,
  UpdateProductTypeDto,
} from './dto/product.dto';
import { buildFullName, buildProductCode, pad } from './product.util';

const PRODUCT_INCLUDE = {
  category: {
    select: {
      id: true,
      code: true,
      name: true,
      type: { select: { id: true, code: true, name: true, profitPercent: true } },
    },
  },
  // آخرین قیمت تاییدشده = قیمت فعلی
  prices: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      purchasePrice: true,
      costPrice: true,
      sellPrice: true,
      profitLossPercent: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRels = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── نوع کالا ───────────────

  async createType(dto: CreateProductTypeDto) {
    try {
      return await this.prisma.productType.create({ data: dto });
    } catch (e) {
      this.rethrowUnique(e, 'نوع کالا با این کد قبلاً ثبت شده است');
    }
  }

  listTypes() {
    return this.prisma.productType.findMany({
      orderBy: { code: 'asc' },
      include: { categories: { orderBy: { code: 'asc' } } },
    });
  }

  async updateType(id: string, dto: UpdateProductTypeDto) {
    await this.mustFind(this.prisma.productType.findUnique({ where: { id } }), 'نوع کالا');
    return this.prisma.productType.update({ where: { id }, data: dto });
  }

  async removeType(id: string) {
    await this.mustFind(this.prisma.productType.findUnique({ where: { id } }), 'نوع کالا');
    const cats = await this.prisma.productCategory.count({ where: { typeId: id } });
    if (cats) throw new ConflictException('این نوع کالا کتگوری دارد و قابل حذف نیست');
    await this.prisma.productType.delete({ where: { id } });
    return { deleted: true };
  }

  // ─────────────── کتگوری ───────────────

  async createCategory(typeId: string, dto: CreateProductCategoryDto) {
    await this.mustFind(this.prisma.productType.findUnique({ where: { id: typeId } }), 'نوع کالا');
    try {
      return await this.prisma.productCategory.create({ data: { ...dto, typeId } });
    } catch (e) {
      this.rethrowUnique(e, 'کتگوری با این کد در این نوع کالا قبلاً ثبت شده است');
    }
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    await this.mustFind(this.prisma.productCategory.findUnique({ where: { id } }), 'کتگوری');
    return this.prisma.productCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    await this.mustFind(this.prisma.productCategory.findUnique({ where: { id } }), 'کتگوری');
    const n = await this.prisma.product.count({ where: { categoryId: id } });
    if (n) throw new ConflictException('این کتگوری کالا دارد و قابل حذف نیست');
    await this.prisma.productCategory.delete({ where: { id } });
    return { deleted: true };
  }

  // ─────────────── کالا ───────────────

  private toView(p: ProductWithRels) {
    const { prices, ...rest } = p;
    const cur = prices[0];
    return {
      ...rest,
      price: cur
        ? {
            ...cur,
            purchasePrice: Number(cur.purchasePrice),
            costPrice: Number(cur.costPrice),
            sellPrice: Number(cur.sellPrice),
          }
        : null,
    };
  }

  private dates(dto: UpdateProductDto) {
    const m = dto.manufactureDate ? new Date(dto.manufactureDate) : undefined;
    const e = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    if (m && e && e < m) {
      throw new BadRequestException('تاریخ انقضا نمی‌تواند قبل از تاریخ تولید باشد');
    }
    return { manufactureDate: m, expiryDate: e };
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
      include: { type: true },
    });
    if (!category) throw new NotFoundException('کتگوری یافت نشد');

    // گروه‌بندی = نام نوع کالا (مثلاً تخت) ، نوع = نام کتگوری (مثلاً دو موتوره)
    // مگر اینکه کاربر مقدار دیگری بدهد
    const nameGroup = dto.nameGroup ?? category.type.name;
    const nameType = dto.nameType ?? category.name;
    const fullName = buildFullName({ ...dto, nameGroup, nameType });

    const { categoryId, manufactureDate, expiryDate, ...rest } = dto;
    const dates = this.dates({ manufactureDate, expiryDate });

    // شماره ۴ رقمی بعدی؛ در برخورد همزمان (unique) چند بار تلاش می‌شود
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await this.prisma.product.findFirst({
        where: { categoryId },
        orderBy: { itemCode: 'desc' },
        select: { itemCode: true },
      });
      const next = (last ? parseInt(last.itemCode, 10) : 0) + 1;
      if (next > 9999) {
        throw new ConflictException('ظرفیت ۴ رقمی این کتگوری تکمیل شده است');
      }
      const itemCode = pad(next, 4);
      try {
        const created = await this.prisma.product.create({
          data: {
            ...rest,
            ...dates,
            nameGroup,
            nameType,
            categoryId,
            itemCode,
            fullName,
            productCode: buildProductCode(category.type.code, category.code, itemCode),
          },
          include: PRODUCT_INCLUDE,
        });
        return this.toView(created);
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ConflictException('تخصیص کد کالا ناموفق بود؛ دوباره تلاش کنید');
  }

  async findAll(q: QueryProductDto) {
    const where: Prisma.ProductWhereInput = {};
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.typeId) where.category = { typeId: q.typeId };
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.brand) where.brand = { contains: q.brand, mode: 'insensitive' };
    if (q.lotNumber) where.lotNumber = q.lotNumber;
    if (q.serialNumber) where.serialNumber = q.serialNumber;
    if (q.search) {
      const c = { contains: q.search, mode: 'insensitive' as const };
      where.OR = [{ fullName: c }, { productCode: c }, { lotNumber: c }, { serialNumber: c }];
    }
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { [q.sortBy ?? 'createdAt']: q.sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((p) => this.toView(p)),
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!p) throw new NotFoundException('کالا یافت نشد');
    return this.toView(p);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('کالا یافت نشد');

    // null/'' کردن یک ستون نام هم مجاز است؛ ترکیب نهایی را حساب می‌کنیم
    const merged = { ...existing, ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) };
    const fullName = buildFullName(merged);
    if (!fullName) {
      throw new BadRequestException('حداقل یکی از ستون‌های نام کالا باید پر شود');
    }
    const { manufactureDate, expiryDate, ...rest } = dto;
    const dates = this.dates({
      manufactureDate: manufactureDate ?? existing.manufactureDate?.toISOString(),
      expiryDate: expiryDate ?? existing.expiryDate?.toISOString(),
    });
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(manufactureDate ? { manufactureDate: dates.manufactureDate } : {}),
        ...(expiryDate ? { expiryDate: dates.expiryDate } : {}),
        fullName,
      },
      include: PRODUCT_INCLUDE,
    });
    return this.toView(updated);
  }

  async remove(id: string) {
    await this.mustFind(this.prisma.product.findUnique({ where: { id } }), 'کالا');
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * داده‌ی لیبل کد کالا (برای چاپ/بارکد در فرانت)
   * کد ۹ رقمی به سه بخش شکسته می‌شود: نوع | کتگوری | شماره
   */
  async label(id: string) {
    const p = await this.findOne(id);
    return {
      productCode: p.productCode,
      segments: {
        type: { code: p.category.type.code, name: p.category.type.name },
        category: { code: p.category.code, name: p.category.name },
        item: p.itemCode,
      },
      formatted: `${p.category.type.code}-${p.category.code}-${p.itemCode}`,
      fullName: p.fullName,
      lotNumber: p.lotNumber,
      serialNumber: p.serialNumber,
      manufactureDate: p.manufactureDate,
      expiryDate: p.expiryDate,
      price: p.price?.sellPrice ?? null,
    };
  }

  // ─────────────── helpers ───────────────

  private async mustFind<T>(q: Promise<T | null>, what: string): Promise<T> {
    const r = await q;
    if (!r) throw new NotFoundException(`${what} یافت نشد`);
    return r;
  }

  private rethrowUnique(e: unknown, message: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw e;
  }
}
