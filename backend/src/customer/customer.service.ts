import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    if (dto.nationalCode) {
      const existing = await this.prisma.customer.findFirst({
        where: { nationalCode: dto.nationalCode },
      });
      if (existing) {
        throw new ConflictException('مشتری با این کد ملی قبلاً ثبت شده است');
      }
    }

    return this.prisma.customer.create({ data: dto });
  }

  async findAll(query: QueryCustomerDto) {
    const {
      search,
      phoneNumber,
      nationalCode,
      companyName,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.CustomerWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { nationalCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        phoneNumber
          ? { phoneNumber: { contains: phoneNumber, mode: 'insensitive' } }
          : {},
        nationalCode ? { nationalCode } : {},
        companyName
          ? { companyName: { contains: companyName, mode: 'insensitive' } }
          : {},
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
    });

    if (!customer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id); // throws 404 if not found

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
    await this.findOne(id); // throws 404 if not found
    return this.prisma.customer.delete({ where: { id } });
  }

  // برای استفاده‌ی احتمالی توسط ماژول repair-case (یافتن سریع مشتری با کد ملی/شماره تماس)
  async findByPhoneNumber(phoneNumber: string) {
    return this.prisma.customer.findFirst({ where: { phoneNumber } });
  }
}
