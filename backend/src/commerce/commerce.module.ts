import { Module } from '@nestjs/common';
import {
  EvaluationTemplatesController,
  SupplierEvaluationsController,
} from './evaluation/evaluation.controller';
import { EvaluationService } from './evaluation/evaluation.service';
import { PricingController } from './pricing/pricing.controller';
import { PricingService } from './pricing/pricing.service';
import { ProductCatalogController, ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';

/** بخش بازرگانی: تامین‌کنندگان + محصولات */
@Module({
  controllers: [
    SuppliersController,
    EvaluationTemplatesController,
    SupplierEvaluationsController,
    ProductCatalogController,
    ProductsController,
    PricingController,
  ],
  providers: [SuppliersService, EvaluationService, ProductsService, PricingService],
  exports: [ProductsService, SuppliersService],
})
export class CommerceModule {}
