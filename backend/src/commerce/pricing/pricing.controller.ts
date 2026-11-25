import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PricingService } from './pricing.service';
import { ApprovePriceDto, CalculateQueryDto, PricingSettingDto } from './dto/pricing.dto';
import { SetTypeProfitDto } from '../products/dto/product.dto';

@ApiTags('Commerce / Pricing')
@ApiBearerAuth('access-token')
@Controller('pricing')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Get('settings')
  @RequirePermission({ action: 'read', resource: 'pricing' })
  settings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @RequirePermission({ action: 'manage-settings', resource: 'pricing' })
  saveSettings(@Body() dto: PricingSettingDto, @CurrentUser('id') userId: string) {
    return this.service.saveSettings(dto, userId);
  }

  @Get('type-profits')
  @RequirePermission({ action: 'read', resource: 'pricing' })
  typeProfits() {
    return this.service.typeProfits();
  }

  @Put('type-profits/:typeId')
  @RequirePermission({ action: 'manage-settings', resource: 'pricing' })
  setTypeProfit(@Param('typeId', ParseUUIDPipe) typeId: string, @Body() dto: SetTypeProfitDto) {
    return this.service.setTypeProfit(typeId, dto.profitPercent);
  }

  @Get('review-needed')
  @RequirePermission({ action: 'read', resource: 'pricing' })
  reviewNeeded() {
    return this.service.reviewNeeded();
  }

  @Get('products/:productId/calculate')
  @RequirePermission({ action: 'read', resource: 'pricing' })
  calculate(@Param('productId', ParseUUIDPipe) productId: string, @Query() q: CalculateQueryDto) {
    return this.service.calculate(productId, q.sellingPrice);
  }

  @Post('products/:productId/approve')
  @RequirePermission({ action: 'approve', resource: 'pricing' })
  approve(@Param('productId', ParseUUIDPipe) productId: string, @Body() dto: ApprovePriceDto, @CurrentUser('id') userId: string) {
    return this.service.approve(productId, dto, userId);
  }

  @Get('products/:productId/history')
  @RequirePermission({ action: 'read', resource: 'pricing' })
  history(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.history(productId);
  }
}
