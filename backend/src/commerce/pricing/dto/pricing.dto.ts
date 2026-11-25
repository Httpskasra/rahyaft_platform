import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PricingSettingDto {
  @ApiProperty({ description: 'هزینه سربار (حقوق، پورسانت و ...) درصد' }) @Type(() => Number) @IsNumber() @Min(0) @Max(1000) overheadPercent: number;
  @ApiProperty({ description: 'هزینه مالیات از سود خالص — درصد' }) @Type(() => Number) @IsNumber() @Min(0) @Max(1000) profitTaxPercent: number;
  @ApiProperty({ description: 'مالیات بر ارزش افزوده — درصد' }) @Type(() => Number) @IsNumber() @Min(0) @Max(1000) vatPercent: number;
  @ApiProperty({ description: 'هزینه حمل — درصد' }) @Type(() => Number) @IsNumber() @Min(0) @Max(1000) shippingPercent: number;
}

export class ApprovePriceDto {
  @ApiProperty({ description: 'قیمت فروش مورد نظر مدیر' }) @Type(() => Number) @IsNumber() @Min(0) sellingPrice: number;
}

export class CalculateQueryDto {
  @ApiPropertyOptional({ description: 'قیمت پیشنهادی مدیر؛ اگر داده شود اختلاف و درصد سود/زیان هم محاسبه می‌شود' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
}
