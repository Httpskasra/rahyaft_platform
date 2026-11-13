import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  CreateSupplierDto,
  QuerySupplierDto,
  SetSupplierProductsDto,
  UpdateSupplierDto,
} from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('commerce/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'commerce' })
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'commerce' })
  findAll(@Query() query: QuerySupplierDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  /** جایگزینی کامل لیست محصولات تامین‌کننده */
  @Put(':id/products')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  setProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSupplierProductsDto,
  ) {
    return this.service.setProducts(id, dto.productIds);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete', resource: 'commerce' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
