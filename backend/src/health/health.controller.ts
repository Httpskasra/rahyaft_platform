import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Check whether the HTTP service is alive' })
  @ApiOkResponse({
    description: 'Service is healthy.',
    schema: { example: { status: 'ok' } },
  })
  check() {
    return { status: 'ok' };
  }
}