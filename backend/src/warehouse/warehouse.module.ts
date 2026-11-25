import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module';
import {
  InvoicesController, OutboundController, ReceiptsController, StockController, StocktakeController,
  TransfersController, WarehousesController,
} from './warehouse.controllers';
import { InvoicesService } from './services/invoices.service';
import { OutboundService } from './services/outbound.service';
import { ReceiptsService } from './services/receipts.service';
import { StockQueryService } from './services/stock-query.service';
import { StockService } from './services/stock.service';
import { StocktakeService } from './services/stocktake.service';
import { TransfersService } from './services/transfers.service';
import { WarehouseAccessService } from './services/warehouse-access.service';
import { WarehousesService } from './services/warehouses.service';

@Module({
  imports: [CommerceModule],
  controllers: [
    WarehousesController, StockController, ReceiptsController, TransfersController,
    InvoicesController, OutboundController, StocktakeController,
  ],
  providers: [
    WarehouseAccessService, WarehousesService, StockService, StockQueryService, InvoicesService,
    ReceiptsService, TransfersService, OutboundService, StocktakeService,
  ],
})
export class WarehouseModule {}
