import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { ApprovePriceDto, CalculatePriceDto, UpdatePricingSettingsDto } from './dto/pricing.dto';
import { PricingService } from './pricing.service';

@Controller('commerce')
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Get('pricing/settings')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  getSettings() {
    return this.service.getSettings();
  }

  @Put('pricing/settings')
  @RequirePermission({ action: 'update', resource: 'commerce' })
  updateSettings(@Body() dto: UpdatePricingSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Post('products/:id/price/calculate')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  calculate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CalculatePriceDto) {
    return this.service.calculate(id, dto);
  }

  @Post('products/:id/price')
  @RequirePermission({ action: 'approve', resource: 'commerce' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, dto, user?.id);
  }

  @Get('products/:id/prices')
  @RequirePermission({ action: 'read', resource: 'commerce' })
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(id);
  }
}
