import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { PurchasingService } from './purchasing.service';
import {
  ChangeOrderStatusDto, CreatePurchaseOrderDto, CreatePurchaseRequestDto, QueryOrdersDto, QueryRequestsDto,
  RejectRequestDto, ReviewRequestDto, UpdatePurchaseOrderDto,
} from './dto/purchasing.dto';

@ApiTags('Commerce / Purchase requests')
@ApiBearerAuth('access-token')
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly service: PurchasingService) {}

  /** Open to every authenticated user (no permission required). */
  @Post()
  create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRequest(dto, user);
  }

  /** Everyone sees their own requests; users with purchase-requests:read see all. */
  @Get()
  list(@Query() q: QueryRequestsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listRequests(q, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getRequest(id, user);
  }

  @Post(':id/approve')
  @RequirePermission({ action: 'approve', resource: 'purchase-requests' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approveRequest(id, dto.note, user);
  }

  @Post(':id/reject')
  @RequirePermission({ action: 'approve', resource: 'purchase-requests' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.rejectRequest(id, dto.note, user);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancelRequest(id, user);
  }
}

@ApiTags('Commerce / Purchase orders')
@ApiBearerAuth('access-token')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchasingService) {}

  @Get('orderable')
  @RequirePermission({ action: 'create', resource: 'purchase-orders' })
  orderable() {
    return this.service.orderable();
  }

  @Post()
  @RequirePermission({ action: 'create', resource: 'purchase-orders' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createOrder(dto, user);
  }

  @Get()
  list(@Query() q: QueryOrdersDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listOrders(q, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getOrder(id, user);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'purchase-orders' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.updateOrder(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission({ action: 'update', resource: 'purchase-orders' })
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeOrderStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.changeStatus(id, dto, user);
  }
}
