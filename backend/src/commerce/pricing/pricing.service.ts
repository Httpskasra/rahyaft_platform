import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovePriceDto, CalculatePriceDto, UpdatePricingSettingsDto } from './dto/pricing.dto';
import { calculatePrice, PricingRates } from './pricing.calculator';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  getSettings() {
    return this.prisma.pricingSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async updateSettings(dto: UpdatePricingSettingsDto) {
    await this.getSettings();
    return this.prisma.pricingSettings.update({ where: { id: 1 }, data: dto });
  }

  private async context(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        productCode: true,
        fullName: true,
        category: { select: { type: { select: { id: true, code: true, name: true, profitPercent: true } } } },
      },
    });
    if (!product) throw new NotFoundException('کالا یافت نشد');
    const s = await this.getSettings();
    const rates: PricingRates = {
      overheadPercent: s.overheadPercent,
      shippingPercent: s.shippingPercent,
      profitTaxPercent: s.profitTaxPercent,
      vatPercent: s.vatPercent,
    };
    return { product, rates, type: product.category.type };
  }

  /** پیش‌نمایش: قیمت تمام شده + (در صورت وجود قیمت کاربر) سود/زیان — بدون ذخیره */
  async calculate(productId: string, dto: CalculatePriceDto) {
    const { product, rates, type } = await this.context(productId);
    return {
      product: { id: product.id, productCode: product.productCode, fullName: product.fullName },
      calculation: calculatePrice(dto.purchasePrice, type.profitPercent, rates, dto.userPrice),
    };
  }

  /** تایید کاربر → ثبت قیمت (آخرین رکورد = قیمت فعلی) */
  async approve(productId: string, dto: ApprovePriceDto, userId?: string) {
    const { rates, type } = await this.context(productId);
    const calc = calculatePrice(dto.purchasePrice, type.profitPercent, rates, dto.userPrice);
    const saved = await this.prisma.productPrice.create({
      data: {
        productId,
        purchasePrice: calc.purchasePrice,
        costPrice: calc.costPrice,
        sellPrice: calc.user!.userPrice,
        profitLossPercent: calc.user!.profitLossPercent,
        breakdown: JSON.parse(JSON.stringify(calc)),
        approvedById: userId,
      },
    });
    return {
      id: saved.id,
      createdAt: saved.createdAt,
      calculation: calc,
    };
  }

  async history(productId: string) {
    await this.context(productId);
    const rows = await this.prisma.productPrice.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      ...r,
      purchasePrice: Number(r.purchasePrice),
      costPrice: Number(r.costPrice),
      sellPrice: Number(r.sellPrice),
    }));
  }
}
