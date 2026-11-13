import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

// ─── نوع کالا (۲ رقم) ───
export class CreateProductTypeDto {
  @Matches(/^\d{2}$/, { message: 'کد نوع کالا باید ۲ رقم باشد' })
  code!: string;

  @IsNotEmpty() @IsString() @MaxLength(150) name!: string;

  /** درصد سود این نوع کالا */
  @IsOptional() @IsNumber() @Min(0) @Max(1000) profitPercent?: number;
}

export class UpdateProductTypeDto {
  @IsOptional() @IsNotEmpty() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) profitPercent?: number;
}

// ─── کتگوری (۳ رقم) ───
export class CreateProductCategoryDto {
  @Matches(/^\d{3}$/, { message: 'کد کتگوری باید ۳ رقم باشد' })
  code!: string;

  @IsNotEmpty() @IsString() @MaxLength(150) name!: string;
}

export class UpdateProductCategoryDto {
  @IsOptional() @IsNotEmpty() @IsString() @MaxLength(150) name?: string;
}

// ─── کالا ───
class ProductFieldsDto {
  // اجزای نام (همگی اختیاری)
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) nameGroup?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) nameType?: string;
  @IsOptional() @IsString() @MaxLength(200) @Transform(emptyToUndefined) nameDefinition?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) brand?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) model?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) grade?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) extraCode?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) color?: string;

  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) lotNumber?: string;
  @IsOptional() @IsString() @MaxLength(100) @Transform(emptyToUndefined) serialNumber?: string;

  @IsOptional() @IsDateString() @Transform(emptyToUndefined) manufactureDate?: string;
  @IsOptional() @IsDateString() @Transform(emptyToUndefined) expiryDate?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductDto extends ProductFieldsDto {
  @IsUUID() categoryId!: string;
}

// دسته‌بندی (و در نتیجه کد کالا) بعد از ساخت قابل تغییر نیست
export class UpdateProductDto extends ProductFieldsDto {}

export class QueryProductDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() typeId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() lotNumber?: string;
  @IsOptional() @IsString() serialNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'productCode', 'fullName', 'expiryDate'])
  sortBy?: 'createdAt' | 'productCode' | 'fullName' | 'expiryDate' = 'createdAt';

  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
}
