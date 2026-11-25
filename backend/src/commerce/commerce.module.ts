import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { EvaluationController } from './evaluation/evaluation.controller';
import { EvaluationService } from './evaluation/evaluation.service';
import { ProductsController, ProductTypesController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { LabelService } from './products/label.service';
import { PricingController } from './pricing/pricing.controller';
import { PricingService } from './pricing/pricing.service';
import { PurchaseOrdersController, PurchaseRequestsController } from './purchasing/purchasing.controller';
import { PurchasingService } from './purchasing/purchasing.service';
import { CommerceBootstrapService } from './commerce-bootstrap.service';

@Module({
  controllers: [
    SuppliersController, EvaluationController, ProductTypesController, ProductsController,
    PricingController, PurchaseRequestsController, PurchaseOrdersController,
  ],
  providers: [CommerceBootstrapService, SuppliersService, EvaluationService, ProductsService, LabelService, PricingService, PurchasingService],
  exports: [PurchasingService, LabelService, ProductsService],
})
export class CommerceModule {}
