import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PurchaseOrderStatus, PurchaseRequestStatus, DeliveryMode, PaymentMethod } from '../../../generated/prisma/enums';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export class RequestItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ type: [RequestItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RequestItemDto)
  items: RequestItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() neededBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReviewRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class RejectRequestDto {
  @ApiProperty() @IsString() @MinLength(2) note: string;
}

export class QueryRequestsDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: PurchaseRequestStatus }) @IsOptional() @IsEnum(PurchaseRequestStatus) status?: PurchaseRequestStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() requesterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
}

export class OrderItemInputDto {
  @ApiPropertyOptional({ description: 'آیتم درخواست؛ اگر ندهید productId الزامی است' }) @IsOptional() @IsUUID() requestItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() requestId?: string;
  @ApiProperty({ description: 'تامین‌کننده کالا' }) @IsUUID() supplierId: string;
  @ApiProperty({ description: 'انبار مقصد دریافت کالا' }) @IsUUID() warehouseId: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryAt?: string;
  @ApiProperty({ enum: DeliveryMode }) @IsEnum(DeliveryMode) deliveryMode: DeliveryMode;
  @ApiPropertyOptional({ description: 'تامین‌کننده حمل (الزامی در TRANSPORT_SUPPLIER)' }) @IsOptional() @IsUUID() transportSupplierId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) transportCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [OrderItemInputDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryAt?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional({ enum: DeliveryMode }) @IsOptional() @IsEnum(DeliveryMode) deliveryMode?: DeliveryMode;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transportSupplierId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) transportCost?: number;
}

export class PurchasedItemPriceDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
}

export class ChangeOrderStatusDto {
  @ApiProperty({ enum: [PurchaseOrderStatus.FOLLOW_UP, PurchaseOrderStatus.PURCHASED, PurchaseOrderStatus.CANCELLED] })
  @IsEnum(PurchaseOrderStatus) status: PurchaseOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional({ type: [PurchasedItemPriceDto], description: 'قیمت خرید هر قلم؛ هنگام «خریداری شده» الزامی (اگر قبلاً ثبت نشده)' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PurchasedItemPriceDto)
  prices?: PurchasedItemPriceDto[];
}

export class QueryOrdersDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() requesterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() buyerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() transportSupplierId?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @ApiPropertyOptional({ enum: DeliveryMode }) @IsOptional() @IsEnum(DeliveryMode) deliveryMode?: DeliveryMode;
  @ApiPropertyOptional({ description: 'موعد تحویل از' }) @IsOptional() @IsDateString() deliveryFrom?: string;
  @ApiPropertyOptional({ description: 'موعد تحویل تا' }) @IsOptional() @IsDateString() deliveryTo?: string;
  @ApiPropertyOptional({ enum: PurchaseOrderStatus }) @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
}
