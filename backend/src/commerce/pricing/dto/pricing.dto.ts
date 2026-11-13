import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePricingSettingsDto {
  /** هزینه سربار (حقوق، پورسانت و ...) — درصد از قیمت خرید */
  @IsOptional() @IsNumber() @Min(0) @Max(1000) overheadPercent?: number;
  /** مالیات از سود خالص */
  @IsOptional() @IsNumber() @Min(0) @Max(100) profitTaxPercent?: number;
  /** مالیات بر ارزش افزوده */
  @IsOptional() @IsNumber() @Min(0) @Max(100) vatPercent?: number;
  /** هزینه حمل — درصد از قیمت خرید */
  @IsOptional() @IsNumber() @Min(0) @Max(1000) shippingPercent?: number;
}

/** پیش‌نمایش محاسبه؛ userPrice (قیمت نهایی با ارزش افزوده) اختیاری است */
export class CalculatePriceDto {
  @IsNumber() @Min(0) purchasePrice!: number;
  @IsOptional() @IsNumber() @Min(0) userPrice?: number;
}

/** تایید و ثبت قیمت؛ هر دو الزامی‌اند و محاسبه سمت سرور تکرار می‌شود */
export class ApprovePriceDto {
  @IsNumber() @Min(0) purchasePrice!: number;
  @IsNumber() @Min(0) userPrice!: number;
}
