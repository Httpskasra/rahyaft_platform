import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min, MinLength } from 'class-validator';
import { BoolQuery, PageQueryDto } from '../../../common/dto/page-query.dto';

export class CreateProductTypeDto {
  @ApiProperty({ description: 'کد ۲ رقمی نوع', example: '01' })
  @Matches(/^\d{2}$/, { message: 'کد نوع باید ۲ رقم باشد' }) code: string;
  @ApiProperty({ description: 'نام نوع (ستون «گروه بندی» جدول نام محصول)', example: 'تخت' })
  @IsString() @MinLength(1) name: string;
}

export class UpdateNameDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
}

export class CreateProductCategoryDto {
  @ApiProperty({ description: 'کد ۳ رقمی کتگوری', example: '001' })
  @Matches(/^\d{3}$/, { message: 'کد کتگوری باید ۳ رقم باشد' }) code: string;
  @ApiProperty({ description: 'نام کتگوری (ستون «نوع» جدول نام محصول)', example: 'سه متوره' })
  @IsString() @MinLength(1) name: string;
}

class ProductNamePartsDto {
  @ApiPropertyOptional({ description: 'پس کد تعریف محصول' }) @IsOptional() @IsString() definitionSuffix?: string;
  @ApiPropertyOptional({ description: 'برند' }) @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional({ description: 'مدل' }) @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional({ description: 'اکونومی / درجه ۱' }) @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional({ description: 'پیش کد اضافه' }) @IsOptional() @IsString() extraPrefix?: string;
  @ApiPropertyOptional({ description: 'رنگ و کد رنگ' }) @IsOptional() @IsString() color?: string;
}

export class CreateProductDto extends ProductNamePartsDto {
  @ApiProperty() @IsUUID() typeId: string;
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty({ description: '۴ رقم آخر کد (دستی)', example: '0001' })
  @Matches(/^\d{4}$/, { message: 'کد کالا باید ۴ رقم باشد' }) itemCode: string;
  @ApiPropertyOptional({ description: 'اگر true باشد هر دستگاه با شماره سریال جدا ثبت می‌شود' })
  @IsOptional() @IsBoolean() trackSerial?: boolean;
}

export class UpdateProductDto extends ProductNamePartsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() trackSerial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CheckProductDto extends ProductNamePartsDto {
  @ApiProperty() @IsUUID() typeId: string;
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty() @Matches(/^\d{4}$/) itemCode: string;
  @ApiPropertyOptional({ description: 'در حالت ویرایش، خود محصول از بررسی تکراری حذف می‌شود' })
  @IsOptional() @IsUUID() excludeId?: string;
}

export class QueryProductsDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() typeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional({ description: 'قیمت فروش از' }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMin?: number;
  @ApiPropertyOptional({ description: 'قیمت فروش تا' }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMax?: number;
  @ApiPropertyOptional({ description: 'true = نیاز به قیمت‌گذاری مجدد' }) @BoolQuery() priceReviewNeeded?: boolean;
  @ApiPropertyOptional({ description: 'true = قیمت فروش دارد، false = بدون قیمت' }) @BoolQuery() hasPrice?: boolean;
  @ApiPropertyOptional({ description: 'true = موجودی دارد، false = موجودی ندارد' }) @BoolQuery() inStock?: boolean;
  @ApiPropertyOptional() @BoolQuery() trackSerial?: boolean;
  @ApiPropertyOptional() @BoolQuery() includeInactive?: boolean;
}

export class SetTypeProfitDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) @Max(1000) profitPercent: number;
}
