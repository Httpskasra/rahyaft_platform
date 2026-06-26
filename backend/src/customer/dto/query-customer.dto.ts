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
import { Gender, OccupationGroup } from './create-customer.dto';

export class QueryCustomerDto {
  // ─── جستجوی عمومی ───────────────────────────────────────
  /**
   * جستجوی آزاد روی نام، نام خانوادگی، کد ملی، موبایل، تلفن
   */
  @IsOptional()
  @IsString()
  search?: string;

  // ─── فیلترهای دقیق (Advanced Search) ────────────────────

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
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsEnum(OccupationGroup, { message: 'گروه شغلی معتبر نیست' })
  occupationGroup?: OccupationGroup;

  @IsOptional()
  @IsEnum(Gender, { message: 'جنسیت باید MALE یا FEMALE باشد' })
  gender?: Gender;

  @IsOptional()
  @IsString()
  email?: string;

  /**
   * فیلتر بر اساس تاریخ ثبت از (فرمت ISO: 2026-01-01)
   */
  @IsOptional()
  @IsString()
  registeredFrom?: string;

  /**
   * فیلتر بر اساس تاریخ ثبت تا (فرمت ISO: 2026-12-31)
   */
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
    'firstName',
    'lastName',
    'registeredAt',
    'city',
    'province',
  ])
  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'firstName'
    | 'lastName'
    | 'registeredAt'
    | 'city'
    | 'province' = 'registeredAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}