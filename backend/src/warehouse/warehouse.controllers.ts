import {
  Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { LabelService } from '../commerce/products/label.service';
import {
  ApproveTransferDto, CreateDispatchDto, CreateOutboundDto, CreateReceiptDto, CreateStocktakeDto, CreateTransferDto,
  CreateWarehouseDto, MarkReadyDto, NoteDto, QueryDispatchesDto, QueryInvoicesDto, QueryOutboundDto, QueryStockDto,
  QueryStocktakeDto, QueryStocktakesDto, QueryTransfersDto, ReasonDto, SaveCountsDto, UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { InvoicesService } from './services/invoices.service';
import { OutboundService, MAX_DISPATCH_VIDEO_SIZE } from './services/outbound.service';
import { ReceiptsService } from './services/receipts.service';
import { StockQueryService } from './services/stock-query.service';
import { StocktakeService } from './services/stocktake.service';
import { TransfersService } from './services/transfers.service';
import { WarehousesService } from './services/warehouses.service';

@ApiTags('Warehouse / Warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'warehouses' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  list(@Query('includeInactive') includeInactive?: string) {
    return this.service.list(includeInactive === 'true');
  }

  @Get('tree')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  tree() {
    return this.service.tree();
  }

  @Get('mine')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'warehouses' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete', resource: 'warehouses' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('Warehouse / Stock')
@ApiBearerAuth('access-token')
@Controller('warehouse-stock')
export class StockController {
  constructor(private readonly service: StockQueryService, private readonly labels: LabelService) {}

  /** Product-level totals + per-warehouse breakdown. Managers see everything; keepers only their warehouses. */
  @Get('summary')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  summary(@Query() q: QueryStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user, q);
  }

  @Get('items')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  items(@Query() q: QueryStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.items(user, q);
  }

  /** Printable label (QR + barcode) for a lot / serial. */
  @Get('items/:id/label/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  async itemLabel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const i = await this.service.getItem(user, id);
    return this.labels.renderSheet([{
      title: i.product.fullName, code: i.product.code,
      subtitle: `Lot: ${i.lotNumber}${i.serialNumber ? ` | SN: ${i.serialNumber}` : ''}`,
      qrText: [i.product.code, i.lotNumber, i.serialNumber].filter(Boolean).join('|'),
    }]);
  }
}

@ApiTags('Warehouse / Receipts')
@ApiBearerAuth('access-token')
@Controller('warehouse-receipts')
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}

  @Get('incoming-orders')
  @RequirePermission({ action: 'read', resource: 'warehouse-receipts' })
  incoming(@CurrentUser() user: AuthenticatedUser) {
    return this.service.incomingOrders(user);
  }

  @Post()
  @RequirePermission({ action: 'create', resource: 'warehouse-receipts' })
  create(@Body() dto: CreateReceiptDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }
}

@ApiTags('Warehouse / Transfers')
@ApiBearerAuth('access-token')
@Controller('warehouse-transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'warehouse-transfers' })
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'warehouse-transfers' })
  list(@Query() q: QueryTransfersDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'warehouse-transfers' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.get(id, user);
  }

  @Post(':id/approve')
  @RequirePermission({ action: 'approve', resource: 'warehouse-transfers' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, dto, user);
  }

  @Post(':id/reject')
  @RequirePermission({ action: 'approve', resource: 'warehouse-transfers' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reject(id, dto.reason, user);
  }

  @Post(':id/receive')
  @RequirePermission({ action: 'receive', resource: 'warehouse-transfers' })
  receive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.receive(id, user);
  }
}

@ApiTags('Warehouse / Invoices')
@ApiBearerAuth('access-token')
@Controller('warehouse-invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  list(@Query() q: QueryInvoicesDto) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermission({ action: 'read', resource: 'warehouses' })
  print(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.renderHtml(id);
  }
}

@ApiTags('Warehouse / Outbound')
@ApiBearerAuth('access-token')
@Controller('warehouse-outbound')
export class OutboundController {
  constructor(private readonly service: OutboundService) {}

  // requests (manager side)
  @Post()
  @RequirePermission({ action: 'create', resource: 'warehouse-outbound' })
  create(@Body() dto: CreateOutboundDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRequest(dto, user);
  }

  @Get()
  @RequirePermission({ action: 'allocate', resource: 'warehouse-outbound' })
  list(@Query() q: QueryOutboundDto) {
    return this.service.listRequests(q);
  }

  // dispatches (keeper side) — static routes first
  @Get('dispatches')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  dispatches(@Query() q: QueryDispatchesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listDispatches(q, user);
  }

  @Get('dispatches/:id')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  dispatch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getDispatch(id, user);
  }

  @Post('dispatches/:id/approve')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approve(id, user);
  }

  @Post('dispatches/:id/reject')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reject(id, dto.reason, user);
  }

  @Post('dispatches/:id/video')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('video', { limits: { fileSize: MAX_DISPATCH_VIDEO_SIZE } }))
  uploadVideo(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() video: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.service.uploadVideo(id, video, user);
  }

  @Get('dispatches/:id/video')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  video(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.streamVideo(id, user);
  }

  @Post('dispatches/:id/ready')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  ready(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkReadyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markReady(id, dto, user);
  }

  @Post('dispatches/:id/deliver')
  @RequirePermission({ action: 'process', resource: 'warehouse-outbound' })
  deliver(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.deliver(id, user);
  }

  // request detail / allocation (manager)
  @Get(':id')
  @RequirePermission({ action: 'allocate', resource: 'warehouse-outbound' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getRequest(id);
  }

  @Get(':id/availability')
  @RequirePermission({ action: 'allocate', resource: 'warehouse-outbound' })
  availability(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.availability(id);
  }

  @Post(':id/dispatches')
  @RequirePermission({ action: 'allocate', resource: 'warehouse-outbound' })
  createDispatch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDispatchDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createDispatch(id, dto, user);
  }

  @Post(':id/cancel')
  @RequirePermission({ action: 'allocate', resource: 'warehouse-outbound' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancelRequest(id, user);
  }
}

@ApiTags('Warehouse / Stocktake')
@ApiBearerAuth('access-token')
@Controller('stocktakes')
export class StocktakeController {
  constructor(private readonly service: StocktakeService) {}

  @Post()
  @RequirePermission({ action: 'manage', resource: 'stocktakes' })
  create(@Body() dto: CreateStocktakeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'stocktakes' })
  list(@Query() q: QueryStocktakesDto) {
    return this.service.list(q);
  }

  @Get('active/mine')
  @RequirePermission({ action: 'count', resource: 'stocktakes' })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.mine(user);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'stocktakes' })
  get(@Param('id', ParseUUIDPipe) id: string, @Query() q: QueryStocktakeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.get(id, user, q.search ?? q.q);
  }

  @Put(':id/warehouses/:warehouseId/counts')
  @RequirePermission({ action: 'count', resource: 'stocktakes' })
  saveCounts(
    @Param('id', ParseUUIDPipe) id: string, @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: SaveCountsDto, @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.saveCounts(id, warehouseId, dto, user);
  }

  @Post(':id/warehouses/:warehouseId/submit')
  @RequirePermission({ action: 'count', resource: 'stocktakes' })
  submit(@Param('id', ParseUUIDPipe) id: string, @Param('warehouseId', ParseUUIDPipe) warehouseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(id, warehouseId, user);
  }

  @Post(':id/warehouses/:warehouseId/return')
  @RequirePermission({ action: 'manage', resource: 'stocktakes' })
  returnSheet(
    @Param('id', ParseUUIDPipe) id: string, @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Body() dto: NoteDto, @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.returnSheet(id, warehouseId, dto.note, user);
  }

  @Post(':id/finalize')
  @RequirePermission({ action: 'manage', resource: 'stocktakes' })
  finalize(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.finalize(id, user);
  }

  @Post(':id/cancel')
  @RequirePermission({ action: 'manage', resource: 'stocktakes' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancel(id, user);
  }
}
