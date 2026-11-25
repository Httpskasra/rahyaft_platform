import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested,
} from 'class-validator';
import {
  DeliveryType, OutboundDispatchStatus, OutboundRequestStatus, StockTransferStatus, WarehouseInvoiceType,
} from '../../generated/prisma/enums';
import { BoolQuery, PageQueryDto } from '../../common/dto/page-query.dto';


// ── warehouses ──
export class CreateWarehouseDto {
  @ApiProperty({ description: 'شماره انبار / زیرانبار' }) @IsString() @MinLength(1) number: string;
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ description: 'انبار والد (برای ساخت زیرانبار)' }) @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional({ description: 'انباردار (کاربر)' }) @IsOptional() @IsUUID() keeperId?: string;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() keeperId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── stock queries ──
export class QueryStockDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ description: 'شامل زیرانبارهای انبار انتخابی (پیش‌فرض true)' })
  @IsOptional() @Transform(({ value }) => value !== false && value !== 'false') @IsBoolean() includeChildren?: boolean;
  @ApiPropertyOptional({ description: 'نوع محصول' }) @IsOptional() @IsUUID() typeId?: string;
  @ApiPropertyOptional({ description: 'کتگوری محصول' }) @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ description: 'شماره Lot' }) @IsOptional() @IsString() lotNumber?: string;
  @ApiPropertyOptional({ description: 'شماره سریال' }) @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional({ description: 'حداقل موجودی (جمع محصول)' }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) minQuantity?: number;
  @ApiPropertyOptional({ description: 'حداکثر موجودی (جمع محصول)' }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxQuantity?: number;
  @ApiPropertyOptional({ description: 'انقضا از' }) @IsOptional() @IsDateString() expiryFrom?: string;
  @ApiPropertyOptional({ description: 'انقضا تا' }) @IsOptional() @IsDateString() expiryTo?: string;
  @ApiPropertyOptional({ description: 'اقلامی که طی N روز آینده منقضی می‌شوند' }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) expiringInDays?: number;
  @ApiPropertyOptional({ description: 'true = فقط منقضی‌شده‌ها' }) @BoolQuery() expired?: boolean;
}

// ── receipts ──
export class ReceiptLineDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ description: 'شماره Lot' }) @IsString() @MinLength(1) lotNumber: string;
  @ApiPropertyOptional({ type: [String], description: 'شماره‌های سریال (هر سریال یک واحد). اگر داده شود تعداد = تعداد سریال‌ها' })
  @IsOptional() @IsArray() @IsString({ each: true }) serialNumbers?: string[];
  @ApiPropertyOptional({ description: 'تعداد (برای کالاهای بدون سریال)' }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() manufactureDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
}

export class CreateReceiptDto {
  @ApiProperty() @IsUUID() warehouseId: string;
  @ApiPropertyOptional({ description: 'سفارش خرید مربوطه (اختیاری)' }) @IsOptional() @IsUUID() purchaseOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [ReceiptLineDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReceiptLineDto)
  lines: ReceiptLineDto[];
}

// ── transfers ──
export class TransferLineDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'انبار مبدا (تایید‌کننده)' }) @IsUUID() fromWarehouseId: string;
  @ApiProperty({ description: 'انبار مقصد (درخواست‌دهنده)' }) @IsUUID() toWarehouseId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [TransferLineDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}

export class PickDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsUUID() stockItemId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class ApproveTransferDto {
  @ApiPropertyOptional({ type: [PickDto], description: 'انتخاب دستی Lot/سریال؛ اگر ندهید به روش FEFO (زودترین انقضا) انتخاب می‌شود' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PickDto)
  picks?: PickDto[];
}

export class ReasonDto {
  @ApiProperty() @IsString() @MinLength(2) reason: string;
}

export class QueryTransfersDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() fromWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() toWarehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() requestedById?: string;
  @ApiPropertyOptional({ enum: StockTransferStatus }) @IsOptional() @IsEnum(StockTransferStatus) status?: StockTransferStatus;
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'] }) @IsOptional() @IsString() direction?: 'incoming' | 'outgoing';
}

// ── invoices ──
export class QueryInvoicesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: WarehouseInvoiceType }) @IsOptional() @IsEnum(WarehouseInvoiceType) type?: WarehouseInvoiceType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional({ description: 'کالایی که در خطوط فاکتور آمده' }) @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() issuedById?: string;
}

// ── outbound ──
export class OutboundItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class CreateOutboundDto {
  @ApiPropertyOptional({ description: 'مشتری (شخص/سازمان) از ماژول مشتریان' }) @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional({ description: 'شماره سفارش فروش؛ در صورت نبود شماره خودکار سیستم استفاده می‌شود' }) @IsOptional() @IsString() saleOrderNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [OutboundItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OutboundItemDto)
  items: OutboundItemDto[];
}

export class CreateDispatchDto {
  @ApiProperty({ description: 'زیرانبار انتخابی' }) @IsUUID() warehouseId: string;
  @ApiProperty({ type: [OutboundItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OutboundItemDto)
  lines: OutboundItemDto[];
}

export class MarkReadyDto {
  @ApiProperty({ enum: DeliveryType }) @IsEnum(DeliveryType) deliveryType: DeliveryType;
  @ApiPropertyOptional({ description: 'تحویل حضوری: نام گیرنده' }) @IsOptional() @IsString() receiverName?: string;
  @ApiPropertyOptional({ description: 'تحویل حضوری: شماره گیرنده (الزامی)' }) @IsOptional() @IsString() receiverPhone?: string;
  @ApiPropertyOptional({ description: 'باربری: تامین‌کننده حمل‌ونقل (الزامی)' }) @IsOptional() @IsUUID() transportSupplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportNote?: string;
  @ApiPropertyOptional({ type: [PickDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PickDto)
  picks?: PickDto[];
}

export class QueryOutboundDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: OutboundRequestStatus }) @IsOptional() @IsEnum(OutboundRequestStatus) status?: OutboundRequestStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() requestedById?: string;
}

export class QueryDispatchesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: OutboundDispatchStatus }) @IsOptional() @IsEnum(OutboundDispatchStatus) status?: OutboundDispatchStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() requestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ enum: DeliveryType }) @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transportSupplierId?: string;
}

export class QueryStocktakesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['COUNTING', 'COMPLETED', 'CANCELLED'] }) @IsOptional() @IsIn(['COUNTING', 'COMPLETED', 'CANCELLED']) status?: 'COUNTING' | 'COMPLETED' | 'CANCELLED';
}

// ── stocktake ──
export class CreateStocktakeDto {
  @ApiPropertyOptional({ type: [String], description: 'انبارهای شرکت‌کننده؛ پیش‌فرض همه انبارهای فعال' })
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) warehouseIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CountItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiPropertyOptional({ description: 'null = پاک کردن شمارش' }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) countedQuantity?: number | null;
}

export class SaveCountsDto {
  @ApiProperty({ type: [CountItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => CountItemDto)
  counts: CountItemDto[];
}

export class NoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class QueryStocktakeDto {
  @ApiPropertyOptional({ description: 'جستجوی نام/کد محصول داخل برگه‌های شمارش' }) @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'مترادف search' }) @IsOptional() @IsString() q?: string;
}

