import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { SupplierEntityType, SupplierKind, SupplierLabel } from '../../../generated/prisma/enums';
import { BoolQuery, PageQueryDto } from '../../../common/dto/page-query.dto';

export class SupplierProductInputDto {
  @ApiPropertyOptional({ description: 'Required for GOODS suppliers (a warehouse product)' })
  @IsOptional() @IsUUID() productId?: string;

  @ApiPropertyOptional({ description: 'Required for TRANSPORT suppliers: the transport service title' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ description: 'Last known price / shipping cost' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ enum: SupplierKind }) @IsEnum(SupplierKind) kind: SupplierKind;
  @ApiProperty({ enum: SupplierEntityType }) @IsEnum(SupplierEntityType) entityType: SupplierEntityType;

  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountantName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountantPhone?: string;

  @ApiPropertyOptional({ description: 'Person phone (companies use representative/accountant phones)' })
  @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ type: [SupplierProductInputDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SupplierProductInputDto)
  products?: SupplierProductInputDto[];
}

export class UpdateSupplierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() representativePhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountantName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountantPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReplaceSupplierProductsDto {
  @ApiProperty({ type: [SupplierProductInputDto] })
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SupplierProductInputDto)
  products: SupplierProductInputDto[];
}

export class QuerySuppliersDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: SupplierKind }) @IsOptional() @IsEnum(SupplierKind) kind?: SupplierKind;
  @ApiPropertyOptional({ enum: SupplierEntityType }) @IsOptional() @IsEnum(SupplierEntityType) entityType?: SupplierEntityType;
  @ApiPropertyOptional({ enum: SupplierLabel }) @IsOptional() @IsEnum(SupplierLabel) label?: SupplierLabel;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ description: 'true = شامل غیرفعال‌ها' }) @BoolQuery() includeInactive?: boolean;
  @ApiPropertyOptional({ description: 'حداقل امتیاز' }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) scoreMin?: number;
  @ApiPropertyOptional({ description: 'حداکثر امتیاز' }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) scoreMax?: number;
  @ApiPropertyOptional({ description: 'true = ارزیابی ندارد یا بیش از ۳ ماه از آخرین ارزیابی گذشته' }) @BoolQuery() evaluationOverdue?: boolean;
  @ApiPropertyOptional({ description: 'true = حداقل یک ارزیابی دارد، false = هیچ ارزیابی ندارد' }) @BoolQuery() hasEvaluation?: boolean;
}
