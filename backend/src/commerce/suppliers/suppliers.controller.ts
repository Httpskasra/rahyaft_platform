import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, QuerySuppliersDto, ReplaceSupplierProductsDto, UpdateSupplierDto } from './dto/supplier.dto';

@ApiTags('Commerce / Suppliers')
@ApiBearerAuth('access-token')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'suppliers' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'suppliers' })
  list(@Query() q: QuerySuppliersDto) {
    return this.service.list(q);
  }

  @Get('by-product/:productId')
  @RequirePermission({ action: 'read', resource: 'suppliers' })
  byProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.byProduct(productId);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'suppliers' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'suppliers' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/products')
  @RequirePermission({ action: 'update', resource: 'suppliers' })
  replaceProducts(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceSupplierProductsDto) {
    return this.service.replaceProducts(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete', resource: 'suppliers' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
