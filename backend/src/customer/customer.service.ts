import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerActivityType,
  CustomerType,
  Prisma,
  SalesOpportunityStatus,
} from 'src/generated/prisma/client';

import { EventsService } from '../events/events.service';
import { CustomerDomainEventType } from '../events/types/domain-event.types';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { CreateSalesOpportunityDto } from './dto/create-sales-opportunity.dto';
import { UpdateSalesOpportunityDto } from './dto/update-sales-opportunity.dto';
import { CreateCustomerActivityDto } from './dto/create-customer-activity.dto';
import { CreateCustomerAiAnalysisDto } from './dto/create-customer-ai-analysis.dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private normalizeEmptyValues<T extends object>(data: T): T {
    const normalized = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' || value === null ? undefined : value,
      ]),
    );

    return normalized as T;
  }

  private validateCustomerBusinessRules(dto: {
    type?: CustomerType | null;
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    mobile?: string | null;
    phone?: string | null;
  }) {
    const type = dto.type ?? CustomerType.PERSON;

    if (type === CustomerType.PERSON) {
      if (!dto.firstName) {
        throw new BadRequestException('نام برای مشتری حقیقی الزامی است');
      }

      if (!dto.lastName) {
        throw new BadRequestException(
          'نام خانوادگی برای مشتری حقیقی الزامی است',
        );
      }
    }

    if (type === CustomerType.ORGANIZATION) {
      if (!dto.organizationName) {
        throw new BadRequestException(
          'نام سازمان برای مشتری سازمانی الزامی است',
        );
      }
    }

    if (!dto.mobile && !dto.phone) {
      throw new BadRequestException(
        'حداقل یکی از شماره موبایل یا تلفن باید وارد شود',
      );
    }
  }

  private buildCustomerData(
    dto: CreateCustomerDto | UpdateCustomerDto,
  ): Prisma.CustomerUncheckedCreateInput | Prisma.CustomerUncheckedUpdateInput {
    const data = this.normalizeEmptyValues(dto);

    const type = data.type ?? CustomerType.PERSON;

    if (type === CustomerType.PERSON) {
      return {
        ...data,

        organizationName: null,
        economicCode: null,
        registrationNo: null,
        nationalId: null,
      };
    }

    return {
      ...data,

      firstName: null,
      lastName: null,
      nationalCode: null,
      birthDate: null,
      gender: null,
    };
  }

  private async checkDuplicateUniqueFields(
    dto: CreateCustomerDto | UpdateCustomerDto,
    excludeCustomerId?: string,
  ) {
    const or: Prisma.CustomerWhereInput[] = [];

    if (dto.nationalCode) {
      or.push({ nationalCode: dto.nationalCode });
    }

    if (dto.economicCode) {
      or.push({ economicCode: dto.economicCode });
    }

    if (dto.registrationNo) {
      or.push({ registrationNo: dto.registrationNo });
    }

    if (dto.nationalId) {
      or.push({ nationalId: dto.nationalId });
    }

    if (or.length === 0) return;

    const existing = await this.prisma.customer.findFirst({
      where: {
        OR: or,
        ...(excludeCustomerId ? { NOT: { id: excludeCustomerId } } : {}),
      },
    });

    if (!existing) return;

    if (dto.nationalCode && existing.nationalCode === dto.nationalCode) {
      throw new ConflictException('مشتری با این کد ملی قبلاً ثبت شده است');
    }

    if (dto.economicCode && existing.economicCode === dto.economicCode) {
      throw new ConflictException('سازمان با این کد اقتصادی قبلاً ثبت شده است');
    }

    if (dto.registrationNo && existing.registrationNo === dto.registrationNo) {
      throw new ConflictException('سازمان با این شماره ثبت قبلاً ثبت شده است');
    }

    if (dto.nationalId && existing.nationalId === dto.nationalId) {
      throw new ConflictException('سازمان با این شناسه ملی قبلاً ثبت شده است');
    }
  }
  private createSystemActivity(
    tx: Prisma.TransactionClient,
    data: {
      customerId: string;
      type: CustomerActivityType;
      title: string;
      body?: string;
      relatedRepairId?: string;
      relatedSalesOpportunityId?: string;
      dueAt?: Date;
    },
  ) {
    return tx.customerActivity.create({
      data: {
        customerId: data.customerId,
        type: data.type,
        title: data.title,
        body: data.body,
        relatedRepairId: data.relatedRepairId,
        relatedSalesOpportunityId: data.relatedSalesOpportunityId,
        dueAt: data.dueAt,
      },
    });
  }

  private publishCustomerChanged(
    type: CustomerDomainEventType,
    customerId: string,
    metadata?: Record<string, unknown>,
  ) {
    this.events
      .publishCustomerEvent(type, {
        customerId,
        metadata,
      })
      .catch((error) => {
        console.error('Customer event publish failed:', error);
      });
  }

  // ─────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────

  async create(dto: CreateCustomerDto) {
    this.validateCustomerBusinessRules(dto);

    await this.checkDuplicateUniqueFields(dto);

    const data = this.buildCustomerData(dto);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: data as Prisma.CustomerUncheckedCreateInput,
      });

      const customerTitle =
        customer.type === CustomerType.ORGANIZATION
          ? customer.organizationName
          : `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();

      await this.createSystemActivity(tx, {
        customerId: customer.id,
        type: CustomerActivityType.CUSTOMER_CREATED,
        title: 'مشتری ایجاد شد',
        body: customerTitle
          ? `مشتری «${customerTitle}» در سیستم ثبت شد.`
          : 'مشتری جدید در سیستم ثبت شد.',
      });

      this.publishCustomerChanged('customer.created', customer.id);

      return customer;
    });
  }

  async findAll(query: QueryCustomerDto) {
    const {
      search,

      type,
      status,

      firstName,
      lastName,
      nationalCode,
      gender,

      organizationName,
      economicCode,
      registrationNo,
      nationalId,

      mobile,
      phone,
      province,
      city,
      occupation,
      occupationGroup,
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
          { organizationName: { contains: search, mode: 'insensitive' } },
          { nationalCode: { contains: search, mode: 'insensitive' } },
          { economicCode: { contains: search, mode: 'insensitive' } },
          { registrationNo: { contains: search, mode: 'insensitive' } },
          { nationalId: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // ─── فیلتر نوع و وضعیت مشتری ─────────────────────────────
    if (type) conditions.push({ type });
    if (status) conditions.push({ status });

    // ─── فیلترهای شخص حقیقی ──────────────────────────────────
    if (firstName) {
      conditions.push({
        firstName: { contains: firstName, mode: 'insensitive' },
      });
    }

    if (lastName) {
      conditions.push({
        lastName: { contains: lastName, mode: 'insensitive' },
      });
    }

    if (nationalCode) conditions.push({ nationalCode });
    if (gender) conditions.push({ gender });

    // ─── فیلترهای سازمانی ────────────────────────────────────
    if (organizationName) {
      conditions.push({
        organizationName: { contains: organizationName, mode: 'insensitive' },
      });
    }

    if (economicCode) conditions.push({ economicCode });
    if (registrationNo) conditions.push({ registrationNo });
    if (nationalId) conditions.push({ nationalId });

    // ─── فیلترهای تماس، آدرس و شغل ───────────────────────────
    if (mobile) {
      conditions.push({
        mobile: { contains: mobile, mode: 'insensitive' },
      });
    }

    if (phone) {
      conditions.push({
        phone: { contains: phone, mode: 'insensitive' },
      });
    }

    if (province) {
      conditions.push({
        province: { contains: province, mode: 'insensitive' },
      });
    }

    if (city) {
      conditions.push({
        city: { contains: city, mode: 'insensitive' },
      });
    }

    if (occupation) {
      conditions.push({
        occupation: { contains: occupation, mode: 'insensitive' },
      });
    }

    if (occupationGroup) conditions.push({ occupationGroup });

    if (email) {
      conditions.push({
        email: { contains: email, mode: 'insensitive' },
      });
    }

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

          type: true,
          status: true,

          firstName: true,
          lastName: true,
          nationalCode: true,
          birthDate: true,
          gender: true,

          organizationName: true,
          economicCode: true,
          registrationNo: true,
          nationalId: true,

          mobile: true,
          phone: true,
          email: true,
          province: true,
          city: true,
          address: true,
          postalCode: true,

          occupation: true,
          occupationGroup: true,

          registeredAt: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              repairs: true,
              contacts: true,
            },
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
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
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
        salesOpportunities: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        _count: {
          select: {
            repairs: true,
            contacts: true,
            salesOpportunities: true,
            activities: true,
            aiAnalyses: true,
          },
        },
        aiAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    const normalizedDto = this.normalizeEmptyValues(dto);

    const finalType = normalizedDto.type ?? existingCustomer.type;
    const finalStatus = normalizedDto.status ?? existingCustomer.status;

    const mergedData = {
      type: finalType,
      status: finalStatus,

      firstName: normalizedDto.firstName ?? existingCustomer.firstName,
      lastName: normalizedDto.lastName ?? existingCustomer.lastName,
      nationalCode: normalizedDto.nationalCode ?? existingCustomer.nationalCode,
      birthDate: normalizedDto.birthDate ?? existingCustomer.birthDate,
      gender: normalizedDto.gender ?? existingCustomer.gender,

      organizationName:
        normalizedDto.organizationName ?? existingCustomer.organizationName,
      economicCode: normalizedDto.economicCode ?? existingCustomer.economicCode,
      registrationNo:
        normalizedDto.registrationNo ?? existingCustomer.registrationNo,
      nationalId: normalizedDto.nationalId ?? existingCustomer.nationalId,

      mobile: normalizedDto.mobile ?? existingCustomer.mobile,
      phone: normalizedDto.phone ?? existingCustomer.phone,
      email: normalizedDto.email ?? existingCustomer.email,
      province: normalizedDto.province ?? existingCustomer.province,
      city: normalizedDto.city ?? existingCustomer.city,
      address: normalizedDto.address ?? existingCustomer.address,
      postalCode: normalizedDto.postalCode ?? existingCustomer.postalCode,
      occupation: normalizedDto.occupation ?? existingCustomer.occupation,
      occupationGroup:
        normalizedDto.occupationGroup ?? existingCustomer.occupationGroup,
    };

    this.validateCustomerBusinessRules(mergedData);

    await this.checkDuplicateUniqueFields(normalizedDto, id);

    const data: Prisma.CustomerUncheckedUpdateInput = {
      type: finalType,
      status: finalStatus,

      firstName:
        finalType === CustomerType.PERSON ? mergedData.firstName : null,
      lastName: finalType === CustomerType.PERSON ? mergedData.lastName : null,
      nationalCode:
        finalType === CustomerType.PERSON ? mergedData.nationalCode : null,
      birthDate:
        finalType === CustomerType.PERSON ? mergedData.birthDate : null,
      gender: finalType === CustomerType.PERSON ? mergedData.gender : null,

      organizationName:
        finalType === CustomerType.ORGANIZATION
          ? mergedData.organizationName
          : null,
      economicCode:
        finalType === CustomerType.ORGANIZATION
          ? mergedData.economicCode
          : null,
      registrationNo:
        finalType === CustomerType.ORGANIZATION
          ? mergedData.registrationNo
          : null,
      nationalId:
        finalType === CustomerType.ORGANIZATION ? mergedData.nationalId : null,

      mobile: mergedData.mobile,
      phone: mergedData.phone,
      email: mergedData.email,
      province: mergedData.province,
      city: mergedData.city,
      address: mergedData.address,
      postalCode: mergedData.postalCode,
      occupation: mergedData.occupation,
      occupationGroup: mergedData.occupationGroup,
    };

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data,
      });

      await this.createSystemActivity(tx, {
        customerId: id,
        type: CustomerActivityType.CUSTOMER_UPDATED,
        title: 'اطلاعات مشتری ویرایش شد',
        body: 'اطلاعات پایه مشتری بروزرسانی شد.',
      });

      this.publishCustomerChanged('customer.updated', id);

      return customer;
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────
  // Utility methods for other modules
  // ─────────────────────────────────────────────

  async findByMobile(mobile: string) {
    return this.prisma.customer.findFirst({
      where: { mobile },
    });
  }

  async findByNationalCode(nationalCode: string) {
    return this.prisma.customer.findUnique({
      where: { nationalCode },
    });
  }

  async findByOrganizationNationalId(nationalId: string) {
    return this.prisma.customer.findUnique({
      where: { nationalId },
    });
  }
  // ─────────────────────────────────────────────
  // Customer Contacts
  // ─────────────────────────────────────────────

  private async ensureOrganizationCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        type: true,
        organizationName: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    if (customer.type !== CustomerType.ORGANIZATION) {
      throw new BadRequestException(
        'مخاطب فقط برای مشتری سازمانی قابل ثبت است',
      );
    }

    return customer;
  }

  async createContact(customerId: string, dto: CreateCustomerContactDto) {
    await this.ensureOrganizationCustomer(customerId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId },
          data: { isPrimary: false },
        });
      }

      const contact = await tx.customerContact.create({
        data: {
          customerId,
          fullName: dto.fullName,
          role: dto.role,
          mobile: dto.mobile,
          phone: dto.phone,
          email: dto.email,
          isPrimary: dto.isPrimary ?? false,
        },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.CONTACT_CREATED,
        title: 'مخاطب سازمانی اضافه شد',
        body: `مخاطب «${contact.fullName}»${contact.role ? ` با نقش «${contact.role}»` : ''} اضافه شد.`,
      });

      this.publishCustomerChanged('customer.contact.created', customerId, {
        contactId: contact.id,
      });

      return contact;
    });
  }

  async updateContact(
    customerId: string,
    contactId: string,
    dto: UpdateCustomerContactDto,
  ) {
    await this.ensureOrganizationCustomer(customerId);

    const contact = await this.prisma.customerContact.findFirst({
      where: {
        id: contactId,
        customerId,
      },
    });

    if (!contact) {
      throw new NotFoundException('مخاطب مشتری یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: {
            customerId,
            NOT: { id: contactId },
          },
          data: { isPrimary: false },
        });
      }

      const updatedContact = await tx.customerContact.update({
        where: { id: contactId },
        data: {
          fullName: dto.fullName,
          role: dto.role,
          mobile: dto.mobile,
          phone: dto.phone,
          email: dto.email,
          isPrimary: dto.isPrimary,
        },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.CONTACT_UPDATED,
        title: 'مخاطب سازمانی ویرایش شد',
        body: `اطلاعات مخاطب «${updatedContact.fullName}» بروزرسانی شد.`,
      });

      this.publishCustomerChanged('customer.contact.updated', customerId, {
        contactId,
      });

      return updatedContact;
    });
  }

  async removeContact(customerId: string, contactId: string) {
    await this.ensureOrganizationCustomer(customerId);

    const contact = await this.prisma.customerContact.findFirst({
      where: {
        id: contactId,
        customerId,
      },
    });

    if (!contact) {
      throw new NotFoundException('مخاطب مشتری یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedContact = await tx.customerContact.delete({
        where: { id: contactId },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.CONTACT_DELETED,
        title: 'مخاطب سازمانی حذف شد',
        body: `مخاطب «${contact.fullName}» حذف شد.`,
      });

      this.publishCustomerChanged('customer.contact.deleted', customerId, {
        contactId,
      });

      return deletedContact;
    });
  }
  // ─────────────────────────────────────────────
  // Sales Opportunities
  // ─────────────────────────────────────────────

  private async ensureCustomerExists(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        type: true,
        firstName: true,
        lastName: true,
        organizationName: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('مشتری یافت نشد');
    }

    return customer;
  }

  async createSalesOpportunity(
    customerId: string,
    dto: CreateSalesOpportunityDto,
  ) {
    await this.ensureCustomerExists(customerId);

    if (dto.status === SalesOpportunityStatus.LOST && !dto.lossReason) {
      throw new BadRequestException(
        'برای فرصت فروش ناموفق، دلیل از دست رفتن الزامی است',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const opportunity = await tx.salesOpportunity.create({
        data: {
          customerId,
          title: dto.title,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          estimatedValue: dto.estimatedValue,
          probability: dto.probability,
          expectedCloseAt: dto.expectedCloseAt
            ? new Date(dto.expectedCloseAt)
            : undefined,
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : undefined,
          lossReason: dto.lossReason,
        },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.SALES_OPPORTUNITY_CREATED,
        title: 'فرصت فروش ایجاد شد',
        body: `فرصت فروش «${opportunity.title}» ایجاد شد.`,
        relatedSalesOpportunityId: opportunity.id,
        dueAt: opportunity.nextFollowUpAt ?? undefined,
      });

      this.publishCustomerChanged(
        'customer.sales_opportunity.created',
        customerId,
        {
          opportunityId: opportunity.id,
        },
      );

      return opportunity;
    });
  }

  async updateSalesOpportunity(
    customerId: string,
    opportunityId: string,
    dto: UpdateSalesOpportunityDto,
  ) {
    await this.ensureCustomerExists(customerId);

    const opportunity = await this.prisma.salesOpportunity.findFirst({
      where: {
        id: opportunityId,
        customerId,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('فرصت فروش یافت نشد');
    }

    const nextStatus = dto.status ?? opportunity.status;
    const nextLossReason = dto.lossReason ?? opportunity.lossReason;

    if (nextStatus === SalesOpportunityStatus.LOST && !nextLossReason) {
      throw new BadRequestException(
        'برای فرصت فروش ناموفق، دلیل از دست رفتن الزامی است',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOpportunity = await tx.salesOpportunity.update({
        where: { id: opportunityId },
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          estimatedValue: dto.estimatedValue,
          probability: dto.probability,
          expectedCloseAt: dto.expectedCloseAt
            ? new Date(dto.expectedCloseAt)
            : undefined,
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : undefined,
          lossReason: dto.lossReason,
        },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.SALES_OPPORTUNITY_UPDATED,
        title: 'فرصت فروش ویرایش شد',
        body: `فرصت فروش «${updatedOpportunity.title}» بروزرسانی شد.`,
        relatedSalesOpportunityId: updatedOpportunity.id,
        dueAt: updatedOpportunity.nextFollowUpAt ?? undefined,
      });

      this.publishCustomerChanged(
        'customer.sales_opportunity.updated',
        customerId,
        {
          opportunityId,
        },
      );

      return updatedOpportunity;
    });
  }

  async removeSalesOpportunity(customerId: string, opportunityId: string) {
    await this.ensureCustomerExists(customerId);

    const opportunity = await this.prisma.salesOpportunity.findFirst({
      where: {
        id: opportunityId,
        customerId,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('فرصت فروش یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedOpportunity = await tx.salesOpportunity.delete({
        where: { id: opportunityId },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.SALES_OPPORTUNITY_DELETED,
        title: 'فرصت فروش حذف شد',
        body: `فرصت فروش «${opportunity.title}» حذف شد.`,
        relatedSalesOpportunityId: opportunity.id,
      });

      this.publishCustomerChanged(
        'customer.sales_opportunity.deleted',
        customerId,
        {
          opportunityId,
        },
      );

      return deletedOpportunity;
    });
  }
  // ─────────────────────────────────────────────
  // Customer Activities / Timeline
  // ─────────────────────────────────────────────

  async createActivity(customerId: string, dto: CreateCustomerActivityDto) {
    await this.ensureCustomerExists(customerId);

    return this.prisma.customerActivity.create({
      data: {
        customerId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        relatedRepairId: dto.relatedRepairId,
        relatedSalesOpportunityId: dto.relatedSalesOpportunityId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        createdById: dto.createdById,
      },
    });
  }
  // ─────────────────────────────────────────────
  // Customer AI Analysis
  // ─────────────────────────────────────────────

  async createAiAnalysis(customerId: string, dto: CreateCustomerAiAnalysisDto) {
    await this.ensureCustomerExists(customerId);

    return this.prisma.$transaction(async (tx) => {
      const analysis = await tx.customerAiAnalysis.create({
        data: {
          customerId,
          summary: dto.summary,
          riskLevel: dto.riskLevel,
          salesPotential: dto.salesPotential,
          nextBestAction: dto.nextBestAction,
          tags: dto.tags ? (dto.tags as Prisma.InputJsonValue) : undefined,
          insights: dto.insights
            ? (dto.insights as Prisma.InputJsonValue)
            : undefined,
          source: dto.source ?? 'manual',
          modelName: dto.modelName,
        },
      });

      await this.createSystemActivity(tx, {
        customerId,
        type: CustomerActivityType.AI_ANALYSIS_UPDATED,
        title: 'تحلیل هوش مصنوعی بروزرسانی شد',
        body: analysis.nextBestAction
          ? `اقدام پیشنهادی بعدی: ${analysis.nextBestAction}`
          : 'تحلیل جدید برای مشتری ثبت شد.',
      });

      return analysis;
    });
  }

  async getLatestAiAnalysis(customerId: string) {
    await this.ensureCustomerExists(customerId);

    const analysis = await this.prisma.customerAiAnalysis.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      throw new NotFoundException(
        'تحلیل هوش مصنوعی برای این مشتری ثبت نشده است',
      );
    }

    return analysis;
  }
}
