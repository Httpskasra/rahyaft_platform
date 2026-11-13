import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupplierType } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  UpdateSupplierDto,
} from './dto/supplier.dto';

const PRODUCTS_INCLUDE = {
  products: {
    select: {
      product: {
        select: { id: true, productCode: true, fullName: true, brand: true },
      },
    },
  },
} satisfies Prisma.SupplierInclude;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(
    type: SupplierType,
    d: Partial<CreateSupplierDto | UpdateSupplierDto>,
  ) {
    if (type === SupplierType.PERSON && (!d.firstName || !d.lastName)) {
      throw new BadRequestException('نام و نام خانوادگی برای شخص الزامی است');
    }
    if (type === SupplierType.COMPANY && !d.companyName) {
      throw new BadRequestException('نام شرکت برای تامین‌کننده شرکتی الزامی است');
    }
  }

  /** فیلدهای نامربوط به نوع را پاک می‌کند */
  private pickByType(type: SupplierType, d: UpdateSupplierDto) {
    const common = { phone: d.phone, address: d.address, isActive: d.isActive };
    if (type === SupplierType.PERSON) {
      return {
        ...common,
        firstName: d.firstName,
        lastName: d.lastName,
      };
    }
    return {
      ...common,
      companyName: d.companyName,
      representativeName: d.representativeName,
      representativePhone: d.representativePhone,
      accountantName: d.accountantName,
      accountantPhone: d.accountantPhone,
    };
  }

  private async assertProductsExist(ids: string[]) {
    if (!ids.length) return;
    const unique = [...new Set(ids)];
    const count = await this.prisma.product.count({
      where: { id: { in: unique } },
    });
    if (count !== unique.length) {
      throw new BadRequestException('برخی از محصولات انتخاب‌شده یافت نشد');
    }
  }

  private flatten<T extends { products?: { product: unknown }[] }>(s: T) {
    return { ...s, products: s.products?.map((p) => p.product) };
  }

  async create(dto: CreateSupplierDto) {
    this.validate(dto.type, dto);
    const productIds = [...new Set(dto.productIds ?? [])];
    await this.assertProductsExist(productIds);

    const created = await this.prisma.supplier.create({
      data: {
        type: dto.type,
        ...this.pickByType(dto.type, dto),
        products: { create: productIds.map((productId) => ({ productId })) },
      },
      include: PRODUCTS_INCLUDE,
    });
    return this.flatten(created);
  }

  async findAll(q: QuerySupplierDto) {
    const where: Prisma.SupplierWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.label) where.label = q.label;
    if (q.isActive !== undefined) where.isActive = q.isActive;
    if (q.productId) where.products = { some: { productId: q.productId } };
    if (q.search) {
      const c = { contains: q.search, mode: 'insensitive' as const };
      where.OR = [
        { firstName: c },
        { lastName: c },
        { companyName: c },
        { representativeName: c },
        { phone: c },
        { representativePhone: c },
      ];
    }

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        include: PRODUCTS_INCLUDE,
        orderBy: { [q.sortBy ?? 'createdAt']: q.sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((s) => this.flatten(s)),
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        ...PRODUCTS_INCLUDE,
        evaluations: {
          orderBy: { evaluatedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            kind: true,
            totalScore: true,
            label: true,
            evaluatedAt: true,
          },
        },
      },
    });
    if (!supplier) throw new NotFoundException('تامین‌کننده یافت نشد');
    return this.flatten(supplier);
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تامین‌کننده یافت نشد');

    const merged = { ...existing, ...this.stripUndefined(dto) };
    this.validate(existing.type, merged as UpdateSupplierDto);

    if (dto.productIds) await this.assertProductsExist(dto.productIds);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.productIds) {
        await tx.supplierProduct.deleteMany({ where: { supplierId: id } });
        await tx.supplierProduct.createMany({
          data: [...new Set(dto.productIds)].map((productId) => ({
            supplierId: id,
            productId,
          })),
        });
      }
      return tx.supplier.update({
        where: { id },
        data: this.stripUndefined(this.pickByType(existing.type, dto)),
        include: PRODUCTS_INCLUDE,
      });
    });
    return this.flatten(updated);
  }

  async setProducts(id: string, productIds: string[]) {
    return this.update(id, { productIds });
  }

  async remove(id: string) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('تامین‌کننده یافت نشد');
    await this.prisma.supplier.delete({ where: { id } });
    return { deleted: true };
  }

  private stripUndefined<T extends object>(o: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(o).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }
}
