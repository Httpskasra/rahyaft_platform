import { round2 } from '../common/scoring';

export interface PricingRates {
  overheadPercent: number; // هزینه سربار (حقوق، پورسانت و ...)
  shippingPercent: number; // هزینه حمل
  profitTaxPercent: number; // مالیات از سود خالص
  vatPercent: number; // مالیات بر ارزش افزوده
}

export interface PriceCalculation {
  purchasePrice: number;
  rates: PricingRates;
  typeProfitPercent: number;

  overheadAmount: number;
  shippingAmount: number;
  /** قیمت تمام شده = خرید + سربار + حمل */
  costPrice: number;

  profitAmount: number; // سود نوع کالا (درصدی از تمام شده)
  profitTaxAmount: number; // مالیات سود (درصدی از سود)
  systemPriceBeforeVat: number; // تمام شده + سود + مالیات سود
  vatAmount: number;
  /** قیمت اعلامی سیستم (با ارزش افزوده) */
  systemPrice: number;

  /** مقایسه با قیمت واردشده توسط کاربر (فقط وقتی کاربر قیمت داده باشد) */
  user?: {
    userPrice: number; // قیمت نهایی (با ارزش افزوده)، هم‌مبنای قیمت سیستم
    userPriceBeforeVat: number;
    differenceFromSystem: number; // + بیشتر از سیستم ، - کمتر
    differenceFromSystemPercent: number;
    profitLossAmount: number; // سود (+) / زیان (-) خالص نسبت به تمام شده
    profitLossPercent: number; // نسبت به قیمت تمام شده
    profitTaxAmount: number;
    status: 'PROFIT' | 'LOSS' | 'BREAK_EVEN';
  };
}

/**
 * تنها نقطه‌ی فرمول قیمت‌گذاری.
 *
 * قیمت سیستم (همه‌ی درصدها اعمال می‌شود):
 *   تمام شده      = خرید + خرید×سربار% + خرید×حمل%
 *   سود           = تمام شده × سود نوع کالا%
 *   مالیات سود    = سود × مالیات%
 *   قبل از VAT    = تمام شده + سود + مالیات سود
 *   قیمت سیستم    = قبل از VAT × (1 + VAT%)
 *
 * مقایسه: قیمت کاربر هم نهایی (با VAT) فرض می‌شود.
 *   مازاد = قیمت کاربر بدون VAT − تمام شده
 *   اگر مازاد > 0 : سود = مازاد ÷ (1 + مالیات%) و باقی مالیات است
 *   اگر مازاد ≤ 0 : زیان = مازاد (بدون مالیات)
 *   درصد سود/زیان = سود ÷ تمام شده  (روی قیمت سیستم دقیقاً برابر درصد نوع کالاست)
 */
export function calculatePrice(
  purchasePrice: number,
  typeProfitPercent: number,
  rates: PricingRates,
  userPrice?: number,
): PriceCalculation {
  const overheadAmount = purchasePrice * (rates.overheadPercent / 100);
  const shippingAmount = purchasePrice * (rates.shippingPercent / 100);
  const costPrice = purchasePrice + overheadAmount + shippingAmount;

  const profitAmount = costPrice * (typeProfitPercent / 100);
  const profitTaxAmount = profitAmount * (rates.profitTaxPercent / 100);
  const beforeVat = costPrice + profitAmount + profitTaxAmount;
  const vatAmount = beforeVat * (rates.vatPercent / 100);
  const systemPrice = beforeVat + vatAmount;

  const result: PriceCalculation = {
    purchasePrice: round2(purchasePrice),
    rates,
    typeProfitPercent,
    overheadAmount: round2(overheadAmount),
    shippingAmount: round2(shippingAmount),
    costPrice: round2(costPrice),
    profitAmount: round2(profitAmount),
    profitTaxAmount: round2(profitTaxAmount),
    systemPriceBeforeVat: round2(beforeVat),
    vatAmount: round2(vatAmount),
    systemPrice: round2(systemPrice),
  };

  if (userPrice !== undefined && userPrice !== null) {
    const beforeVatUser = userPrice / (1 + rates.vatPercent / 100);
    const excess = beforeVatUser - costPrice;
    const profit =
      excess > 0 ? excess / (1 + rates.profitTaxPercent / 100) : excess;
    const tax = excess > 0 ? excess - profit : 0;

    result.user = {
      userPrice: round2(userPrice),
      userPriceBeforeVat: round2(beforeVatUser),
      differenceFromSystem: round2(userPrice - systemPrice),
      differenceFromSystemPercent:
        systemPrice > 0 ? round2(((userPrice - systemPrice) / systemPrice) * 100) : 0,
      profitLossAmount: round2(profit),
      profitLossPercent: costPrice > 0 ? round2((profit / costPrice) * 100) : 0,
      profitTaxAmount: round2(tax),
      status: excess > 0 ? 'PROFIT' : excess < 0 ? 'LOSS' : 'BREAK_EVEN',
    };
  }
  return result;
}
