import {
  Body, Controller, Delete, Get, Header, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query, StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { LabelService } from './label.service';
import {
  CheckProductDto, CreateProductCategoryDto, CreateProductDto, CreateProductTypeDto, QueryProductsDto, UpdateNameDto,
  UpdateProductDto,
} from './dto/product.dto';

enum LabelKind { qr = 'qr', barcode = 'barcode' }
enum LabelFormat { png = 'png', svg = 'svg' }

@ApiTags('Commerce / Product codes')
@ApiBearerAuth('access-token')
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequirePermission({ action: 'read', resource: 'products' })
  list() {
    return this.service.listTypes();
  }

  @Post()
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  create(@Body() dto: CreateProductTypeDto) {
    return this.service.createType(dto);
  }

  @Patch('categories/:id')
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  renameCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNameDto) {
    return this.service.renameCategory(id, dto.name);
  }

  @Delete('categories/:id')
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeCategory(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  rename(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNameDto) {
    return this.service.renameType(id, dto.name);
  }

  @Delete(':id')
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeType(id);
  }

  @Post(':typeId/categories')
  @RequirePermission({ action: 'manage', resource: 'product-codes' })
  createCategory(@Param('typeId', ParseUUIDPipe) typeId: string, @Body() dto: CreateProductCategoryDto) {
    return this.service.createCategory(typeId, dto);
  }
}

@ApiTags('Commerce / Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService, private readonly labels: LabelService) {}

  @Post()
  @RequirePermission({ action: 'create', resource: 'products' })
  create(@Body() dto: CreateProductDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  /** Duplicate warning while the user is still filling the definition form. */
  @Post('check')
  @RequirePermission({ action: 'create', resource: 'products' })
  check(@Body() dto: CheckProductDto) {
    return this.service.check(dto);
  }

  @Get()
  @RequirePermission({ action: 'read', resource: 'products' })
  list(@Query() q: QueryProductsDto) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission({ action: 'read', resource: 'products' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission({ action: 'update', resource: 'products' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ action: 'delete', resource: 'products' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  /** Raw QR / barcode image of the 9-digit product code. */
  @Get(':id/label/image')
  @RequirePermission({ action: 'read', resource: 'products' })
  async labelImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('kind', new ParseEnumPipe(LabelKind)) kind: LabelKind,
    @Query('format') format: string = 'png',
  ) {
    const p = await this.service.get(id);
    if (format === LabelFormat.svg) {
      const svg = kind === 'qr' ? this.labels.qrSvg(p.code) : this.labels.barcodeSvg(p.code);
      return new StreamableFile(Buffer.from(svg), { type: 'image/svg+xml' });
    }
    return new StreamableFile(await this.labels.png(kind, p.code), { type: 'image/png' });
  }

  /** Printable label (QR + barcode + name). */
  @Get(':id/label/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @RequirePermission({ action: 'read', resource: 'products' })
  async labelPrint(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.service.get(id);
    return this.labels.renderSheet([{ title: p.fullName, code: p.code, subtitle: `کد کالا: ${p.code}` }]);
  }
}
