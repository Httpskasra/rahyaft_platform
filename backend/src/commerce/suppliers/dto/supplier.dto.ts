import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SupplierLabel, SupplierType } from '../../../generated/prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

const optStr = (max = 200) => [
  IsOptional(),
  IsString(),
  MaxLength(max),
  Transform(emptyToUndefined),
];

function Opt(max = 200): PropertyDecorator {
  return (target, key) =>
    optStr(max).forEach((d) => (d as PropertyDecorator)(target, key));
}

export class CreateSupplierDto {
  @IsEnum(SupplierType, { message: 'نوع تامین‌کننده باید PERSON یا COMPANY باشد' })
  type!: SupplierType;

  // شخص
  @Opt(100) firstName?: string;
  @Opt(100) lastName?: string;

  // شرکت
  @Opt(200) companyName?: string;
  @Opt(150) representativeName?: string;
  @Opt(30) representativePhone?: string;
  @Opt(150) accountantName?: string;
  @Opt(30) accountantPhone?: string;

  // مشترک
  @Opt(30) phone?: string;
  @Opt(1000) address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** محصولاتی که این تامین‌کننده تامین می‌کند (از محصولات انبار) */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

// type قابل تغییر نیست
export class UpdateSupplierDto {
  @Opt(100) firstName?: string;
  @Opt(100) lastName?: string;
  @Opt(200) companyName?: string;
  @Opt(150) representativeName?: string;
  @Opt(30) representativePhone?: string;
  @Opt(150) accountantName?: string;
  @Opt(30) accountantPhone?: string;
  @Opt(30) phone?: string;
  @Opt(1000) address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}

export class SetSupplierProductsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  productIds!: string[];
}

export class QuerySupplierDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(SupplierType) type?: SupplierType;
  @IsOptional() @IsEnum(SupplierLabel) label?: SupplierLabel;
  @IsOptional() @IsUUID() productId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'score', 'companyName', 'lastName'])
  sortBy?: 'createdAt' | 'score' | 'companyName' | 'lastName' = 'createdAt';

  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
}
