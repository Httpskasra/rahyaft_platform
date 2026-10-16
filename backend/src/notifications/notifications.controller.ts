import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any, @Query('unreadOnly') unreadOnly?: string, @Query('category') category?: string, @Query('take') take?: string) {
    return this.service.list(req.user.id, { unreadOnly: unreadOnly === 'true', category, take: take ? Number(take) : undefined });
  }

  @Get('summary')
  summary(@Req() req: any) { return this.service.summary(req.user.id); }

  @Patch(':id/read')
  read(@Param('id') id: string, @Req() req: any) { return this.service.markRead(id, req.user.id); }

  @Patch('read/all')
  readAll(@Req() req: any) { return this.service.markAllRead(req.user.id); }
}
