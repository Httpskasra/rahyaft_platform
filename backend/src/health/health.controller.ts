import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}