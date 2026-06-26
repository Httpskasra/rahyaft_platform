import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { nationalCode: dto.nationalCode },
    });
    if (existing) {
      throw new ConflictException('مشتری با این کد ملی قبلاً ثبت شده است');
    }

    return this.prisma.customer.create({ data: dto });
  }

  async findAll(query: QueryCustomerDto) {
    const {
      search,
      firstName,
      lastName,
      nationalCode,
      mobile,
      phone,
      province,
      city,
      occupation,
      occupationGroup,
      gender,
      email,
      registeredFrom,
      registeredTo,
      page = 1,
      pageSize = 20,
      sortBy = 'registeredAt',
      sortOrder = 'desc',
    } = query;

    const conditions: Prisma.CustomerWhereInput[] = [];

    // ─── جستجوی عمومی ───────────────────────────────────────
    if (search) {
      conditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { nationalCode: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // ─── فیلترهای دقیق (Advanced Search) ────────────────────
    if (firstName)
      conditions.push({
        firstName: { contains: firstName, mode: 'insensitive' },
      });

    if (lastName)
      conditions.push({
        lastName: { contains: lastName, mode: 'insensitive' },
      });

    if (nationalCode) conditions.push({ nationalCode });

    if (mobile)
      conditions.push({ mobile: { contains: mobile, mode: 'insensitive' } });

    if (phone)
      conditions.push({ phone: { contains: phone, mode: 'insensitive' } });

    if (province)
      conditions.push({
        province: { contains: province, mode: 'insensitive' },
      });

    if (city)
      conditions.push({ city: { contains: city, mode: 'insensitive' } });

    if (occupation)
      conditions.push({
        occupation: { contains: occupation, mode: 'insensitive' },
      });

    if (occupationGroup) conditions.push({ occupationGroup });

    if (gender) conditions.push({ gender });

    if (email)
      conditions.push({ email: { contains: email, mode: 'insensitive' } });

    // ─── فیلتر بازه زمانی تاریخ ثبت ─────────────────────────
    if (registeredFrom || registeredTo) {
      conditions.push({
        registeredAt: {
          ...(registeredFrom && { gte: new Date(registeredFrom) }),
          ...(registeredTo && { lte: new Date(registeredTo) }),
        },
      });
    }

    const where: Prisma.CustomerWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          phone: true,
          nationalCode: true,
          gender: true,
          province: true,
          city: true,
          occupation: true,
          occupationGroup: true,
          birthDate: true,
          email: true,
          postalCode: true,
          address: true,
          registeredAt: true,
          createdAt: true,
          updatedAt: true,
          // خلاصه تعداد پرونده‌های تعمیراتی
          _count: {
            select: { repairs: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        repairs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            caseNumber: true,
            status: true,
            type: true,
            deviceTitle: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.nationalCode) {
      const existing = await this.prisma.customer.findFirst({
        where: { nationalCode: dto.nationalCode, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          'مشتری دیگری با این کد ملی قبلاً ثبت شده است',
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }

  async findByMobile(mobile: string) {
    return this.prisma.customer.findFirst({ where: { mobile } });
  }

  async findByNationalCode(nationalCode: string) {
    return this.prisma.customer.findUnique({ where: { nationalCode } });
  }
}