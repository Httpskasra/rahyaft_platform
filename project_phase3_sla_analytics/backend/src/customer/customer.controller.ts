import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator'; //موقتی

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CustomerService } from './customer.service';
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { CreateSalesOpportunityDto } from './dto/create-sales-opportunity.dto';
import { UpdateSalesOpportunityDto } from './dto/update-sales-opportunity.dto';
import { CreateCustomerActivityDto } from './dto/create-customer-activity.dto';
import { CreateCustomerAiAnalysisDto } from './dto/create-customer-ai-analysis.dto';

@Public() //موقتی
@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * POST /customers
   * ایجاد مشتری جدید
   */
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  /**
   * GET /customers
   * لیست مشتریان با امکان جستجوی پیشرفته
   *
   * پارامترهای جستجوی عمومی:
   *   ?search=علی (جستجو در نام، نام خانوادگی، کد ملی، موبایل)
   *
   * پارامترهای Advanced Search:
   *   ?firstName=علی
   *   ?lastName=محمدی
   *   ?nationalCode=1234567890
   *   ?mobile=09123456789
   *   ?phone=02112345678
   *   ?province=تهران
   *   ?city=تهران
   *   ?occupation=مهندس
   *   ?occupationGroup=GOVERNMENT_EMPLOYEE
   *   ?gender=MALE
   *   ?email=ali@example.com
   *   ?registeredFrom=2026-01-01
   *   ?registeredTo=2026-12-31
   *
   * صفحه‌بندی:
   *   ?page=1&pageSize=20
   *   ?sortBy=registeredAt&sortOrder=desc
   */
  @Get()
  findAll(@Query() query: QueryCustomerDto) {
    return this.customerService.findAll(query);
  }

  /**
   * GET /customers/:id
   * مشاهده جزئیات یک مشتری (شامل ۱۰ پرونده آخر)
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.findOne(id);
  }

  /**
   * PATCH /customers/:id
   * ویرایش اطلاعات مشتری
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, dto);
  }

  /**
   * DELETE /customers/:id
   * حذف مشتری
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.remove(id);
  }
  /**
   * POST /customers/:customerId/contacts
   * افزودن مخاطب به مشتری سازمانی
   */
  @Post(':customerId/contacts')
  createContact(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerContactDto,
  ) {
    return this.customerService.createContact(customerId, dto);
  }

  /**
   * PATCH /customers/:customerId/contacts/:contactId
   * ویرایش مخاطب مشتری سازمانی
   */
  @Patch(':customerId/contacts/:contactId')
  updateContact(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateCustomerContactDto,
  ) {
    return this.customerService.updateContact(customerId, contactId, dto);
  }

  /**
   * DELETE /customers/:customerId/contacts/:contactId
   * حذف مخاطب مشتری سازمانی
   */
  @Delete(':customerId/contacts/:contactId')
  removeContact(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.customerService.removeContact(customerId, contactId);
  }
  /**
   * POST /customers/:customerId/sales-opportunities
   * افزودن فرصت فروش برای مشتری
   */
  @Post(':customerId/sales-opportunities')
  createSalesOpportunity(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateSalesOpportunityDto,
  ) {
    return this.customerService.createSalesOpportunity(customerId, dto);
  }

  /**
   * PATCH /customers/:customerId/sales-opportunities/:opportunityId
   * ویرایش فرصت فروش مشتری
   */
  @Patch(':customerId/sales-opportunities/:opportunityId')
  updateSalesOpportunity(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: UpdateSalesOpportunityDto,
  ) {
    return this.customerService.updateSalesOpportunity(
      customerId,
      opportunityId,
      dto,
    );
  }

  /**
   * DELETE /customers/:customerId/sales-opportunities/:opportunityId
   * حذف فرصت فروش مشتری
   */
  @Delete(':customerId/sales-opportunities/:opportunityId')
  removeSalesOpportunity(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
  ) {
    return this.customerService.removeSalesOpportunity(
      customerId,
      opportunityId,
    );
  }
  /**
   * POST /customers/:customerId/activities
   * افزودن فعالیت / یادداشت / تماس / پیگیری برای مشتری
   */
  @Post(':customerId/activities')
  createActivity(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerActivityDto,
  ) {
    return this.customerService.createActivity(customerId, dto);
  }
  /**
   * POST /customers/:customerId/ai-analysis
   * ثبت تحلیل مشتری
   */
  @Post(':customerId/ai-analysis')
  createAiAnalysis(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerAiAnalysisDto,
  ) {
    return this.customerService.createAiAnalysis(customerId, dto);
  }

  /**
   * GET /customers/:customerId/ai-analysis/latest
   * آخرین تحلیل مشتری
   */
  @Get(':customerId/ai-analysis/latest')
  getLatestAiAnalysis(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.customerService.getLatestAiAnalysis(customerId);
  }
}
