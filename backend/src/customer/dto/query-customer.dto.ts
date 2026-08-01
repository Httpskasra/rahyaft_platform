/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  CustomerStatus,
  CustomerType,
  Gender,
  OccupationGroup,
} from './create-customer.dto';

export class QueryCustomerDto {
  // ─── جستجوی عمومی ───────────────────────────────────────
  /**
   * جستجوی آزاد روی نام، نام خانوادگی، نام سازمان، کد ملی، موبایل، تلفن، ایمیل
   */
  @IsOptional()
  @IsString()
  search?: string;

  // ─── فیلتر نوع و وضعیت مشتری ─────────────────────────────

  @IsOptional()
  @IsEnum(CustomerType, {
    message: 'نوع مشتری باید PERSON یا ORGANIZATION باشد',
  })
  type?: CustomerType;

  @IsOptional()
  @IsEnum(CustomerStatus, { message: 'وضعیت مشتری معتبر نیست' })
  status?: CustomerStatus;

  // ─── فیلترهای شخص حقیقی ──────────────────────────────────

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalCode?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'جنسیت باید MALE یا FEMALE باشد' })
  gender?: Gender;

  // ─── فیلترهای سازمانی ────────────────────────────────────

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  economicCode?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  // ─── فیلترهای تماس و آدرس ─────────────────────────────────

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // ─── فیلترهای شغلی ───────────────────────────────────────

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsEnum(OccupationGroup, { message: 'گروه شغلی معتبر نیست' })
  occupationGroup?: OccupationGroup;

  // ─── فیلتر بازه زمانی ثبت ────────────────────────────────

  @IsOptional()
  @IsString()
  registeredFrom?: string;

  @IsOptional()
  @IsString()
  registeredTo?: string;

  // ─── صفحه‌بندی ───────────────────────────────────────────

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'registeredAt',
    'firstName',
    'lastName',
    'organizationName',
    'city',
    'province',
    'type',
    'status',
  ])
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'registeredAt'
    | 'firstName'
    | 'lastName'
    | 'organizationName'
    | 'city'
    | 'province'
    | 'type'
    | 'status' = 'registeredAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
