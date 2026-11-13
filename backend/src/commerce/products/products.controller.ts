import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  CreateProductCategoryDto,
  CreateProductDto,
  CreateProductTypeDto,
  QueryProductDto,
  UpdateProductCategoryDto,
  UpdateProductDto,
  UpdateProductTypeDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

/** نوع کالا (۲ رقم) و کتگوری (۳ رقم) */
@Controller('commerce')
export class ProductCatalogController {
  constructor(private readonly service: ProductsService) {}

  @Post('product-types')
  @RequirePermission({ action: 'create', resource: 'commerce' })
  createType(@Body() dto: CreateProductTypeDto) {
    return this.service.createType(dto);
  }

  @Get('product-types')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  listTypes() {
    return this.service.listTypes();
  }

  @Patch('product-types/:id')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  updateType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductTypeDto) {
    return this.service.updateType(id, dto);
  }

  @Delete('product-types/:id')
  @RequirePermission({ action: 'delete', resource: 'commerce' })
  removeType(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeType(id);
  }

  @Post('product-types/:typeId/categories')
  @RequirePermission({ action: 'create', resource: 'commerce' })
  createCategory(
    @Param('typeId', ParseUUIDPipe) typeId: string,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.service.createCategory(typeId, dto);
  }

  @Patch('product-categories/:id')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('product-categories/:id')
  @RequirePermission({ action: 'delete', resource: 'commerce' })
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeCategory(id);
  }
}

@Controller('commerce/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'commerce' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'commerce' })
  findAll(@Query() q: QueryProductDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /** داده‌ی لیبل کد کالا */
  @Get(':id/label')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  label(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.label(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete', resource: 'commerce' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
