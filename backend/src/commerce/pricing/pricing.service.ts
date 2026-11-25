import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { round2 } from '../../common/dto/page-query.dto';
import { ApprovePriceDto, PricingSettingDto } from './dto/pricing.dto';

export interface PricingPercents {
  overhead: number;
  profitTax: number;
  vat: number;
  shipping: number;
  typeProfit: number;
}

/**
 * Pricing formula (kept in ONE place so it is easy to change):
 *   totalPercent = overhead + profitTax + vat + shipping + typeProfit
 *   costPrice    = purchasePrice × (1 + totalPercent / 100)          ← «قیمت تمام شده»
 *   difference   = sellingPrice − costPrice
 *   profit/loss% = (sellingPrice − purchasePrice) / purchasePrice × 100   ← relative to PURCHASE price
 */
export function computePricing(purchasePrice: number, percents: PricingPercents, sellingPrice?: number) {
  const totalPercent = round2(
    percents.overhead + percents.profitTax + percents.vat + percents.shipping + percents.typeProfit,
  );
  const costPrice = round2(purchasePrice * (1 + totalPercent / 100));
  const result: any = { purchasePrice: round2(purchasePrice), percents, totalPercent, costPrice };
  if (sellingPrice !== undefined && sellingPrice !== null) {
    const profitLossPercent = purchasePrice > 0 ? round2(((sellingPrice - purchasePrice) / purchasePrice) * 100) : 0;
    result.sellingPrice = round2(sellingPrice);
    result.differenceAmount = round2(sellingPrice - costPrice);
    result.profitLossPercent = profitLossPercent;
    result.profitLossType = profitLossPercent > 0 ? 'PROFIT' : profitLossPercent < 0 ? 'LOSS' : 'EVEN';
  }
  return result;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const r = await this.prisma.pricingSetting.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
    return {
      overheadPercent: Number(r.overheadPercent), profitTaxPercent: Number(r.profitTaxPercent),
      vatPercent: Number(r.vatPercent), shippingPercent: Number(r.shippingPercent), updatedAt: r.updatedAt,
    };
  }

  async saveSettings(dto: PricingSettingDto, userId: string) {
    await this.prisma.pricingSetting.upsert({
      where: { id: 'default' }, create: { id: 'default', ...dto, updatedById: userId }, update: { ...dto, updatedById: userId },
    });
    return this.getSettings();
  }

  async typeProfits() {
    const types = await this.prisma.productType.findMany({ orderBy: { code: 'asc' } });
    return types.map((t) => ({ typeId: t.id, code: t.code, name: t.name, profitPercent: Number(t.profitPercent) }));
  }

  async setTypeProfit(typeId: string, profitPercent: number) {
    const t = await this.prisma.productType.findUnique({ where: { id: typeId } });
    if (!t) throw new NotFoundException('نوع محصول یافت نشد');
    await this.prisma.productType.update({ where: { id: typeId }, data: { profitPercent } });
    return this.typeProfits();
  }

  private async context(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { type: true } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    if (product.lastPurchasePrice === null) {
      throw new BadRequestException('برای این محصول هنوز قیمت خریدی از طریق سفارشات ثبت نشده است');
    }
    const s = await this.getSettings();
    const percents: PricingPercents = {
      overhead: s.overheadPercent, profitTax: s.profitTaxPercent, vat: s.vatPercent, shipping: s.shippingPercent,
      typeProfit: Number(product.type.profitPercent),
    };
    return { product, percents, purchasePrice: Number(product.lastPurchasePrice) };
  }

  async calculate(productId: string, sellingPrice?: number) {
    const { product, percents, purchasePrice } = await this.context(productId);
    return {
      product: { id: product.id, code: product.code, fullName: product.fullName },
      currentPrice: product.currentPrice, priceReviewNeeded: product.priceReviewNeeded,
      lastPurchaseAt: product.lastPurchaseAt,
      ...computePricing(purchasePrice, percents, sellingPrice),
    };
  }

  async approve(productId: string, dto: ApprovePriceDto, userId: string) {
    const { product, percents, purchasePrice } = await this.context(productId);
    const c = computePricing(purchasePrice, percents, dto.sellingPrice);
    const s = await this.getSettings();
    return this.prisma.$transaction(async (tx) => {
      await tx.productPrice.updateMany({ where: { productId, isCurrent: true }, data: { isCurrent: false } });
      const row = await tx.productPrice.create({
        data: {
          productId, purchasePrice: c.purchasePrice,
          overheadPercent: s.overheadPercent, profitTaxPercent: s.profitTaxPercent, vatPercent: s.vatPercent,
          shippingPercent: s.shippingPercent, typeProfitPercent: percents.typeProfit,
          totalPercent: c.totalPercent, costPrice: c.costPrice, sellingPrice: c.sellingPrice,
          differenceAmount: c.differenceAmount, profitLossPercent: c.profitLossPercent, isCurrent: true, approvedById: userId,
        },
      });
      await tx.product.update({ where: { id: product.id }, data: { currentPrice: c.sellingPrice, priceReviewNeeded: false } });
      return row;
    });
  }

  async history(productId: string) {
    return this.prisma.productPrice.findMany({ where: { productId }, orderBy: { approvedAt: 'desc' } });
  }

  async reviewNeeded() {
    return this.prisma.product.findMany({
      where: { priceReviewNeeded: true, isActive: true },
      select: { id: true, code: true, fullName: true, lastPurchasePrice: true, lastPurchaseAt: true, currentPrice: true },
      orderBy: { lastPurchaseAt: 'desc' },
    });
  }
}
