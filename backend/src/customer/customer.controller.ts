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
import { CustomerService} from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

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
}