import {
  Body,
  Controller,
  UploadedFile,
  UseInterceptors,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CommunicationService } from './communication.service';
import {
  AddEntityLinkDto,
  AddParticipantDto,
  AssignThreadDto,
  CreateMessageDto,
  CreateThreadDto,
  QueryEntitySearchDto,
  QueryMessagesDto,
  QueryThreadsDto,
  UpdateThreadDto,
} from './dto/communication.dto';
import { ThreadEntityType } from '../generated/prisma/enums';

@ApiTags('Communication')
@ApiBearerAuth('access-token')
@Controller('communication')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @Post('threads')
  @RequirePermission({ action: 'create', resource: 'communication' })
  createThread(@Body() dto: CreateThreadDto, @Req() req: any) {
    return this.service.createThread(dto, req.user);
  }

  @Get('threads')
  @RequirePermission({ action: 'read', resource: 'communication' })
  listThreads(@Query() query: QueryThreadsDto, @Req() req: any) {
    return this.service.listThreads(query, req.user, req.matchedPermission);
  }

  @Get('inbox')
  @RequirePermission({ action: 'read', resource: 'communication' })
  inbox(@Req() req: any) {
    return this.service.getInbox(req.user, req.matchedPermission);
  }

  @Get('people')
  @RequirePermission({ action: 'read', resource: 'communication' })
  people() {
    return this.service.listPeople();
  }


  @Get('entities/search')
  @RequirePermission({ action: 'read', resource: 'communication' })
  searchEntities(@Query() query: QueryEntitySearchDto, @Req() req: any) {
    return this.service.searchEntities(query, req.user);
  }

  @Get('entities/:entityType/:entityId/threads')
  @RequirePermission({ action: 'read', resource: 'communication' })
  entityThreads(@Param('entityType', new ParseEnumPipe(ThreadEntityType)) entityType: ThreadEntityType, @Param('entityId', new ParseUUIDPipe({ version: '4' })) entityId: string, @Req() req: any) {
    return this.service.listEntityThreads(entityType, entityId, req.user, req.matchedPermission);
  }

  @Post('threads/:id/entity-links')
  @RequirePermission({ action: 'update', resource: 'communication' })
  addEntityLink(@Param('id') id: string, @Body() dto: AddEntityLinkDto, @Req() req: any) {
    return this.service.addEntityLink(id, dto, req.user, req.matchedPermission);
  }

  @Delete('threads/:id/entity-links/:entityType/:entityId')
  @RequirePermission({ action: 'update', resource: 'communication' })
  removeEntityLink(@Param('id') id: string, @Param('entityType', new ParseEnumPipe(ThreadEntityType)) entityType: ThreadEntityType, @Param('entityId', new ParseUUIDPipe({ version: '4' })) entityId: string, @Req() req: any) {
    return this.service.removeEntityLink(id, entityType, entityId, req.user, req.matchedPermission);
  }

  @Get('threads/:id')
  @RequirePermission({ action: 'read', resource: 'communication' })
  getThread(@Param('id') id: string, @Req() req: any) {
    return this.service.getThread(id, req.user, req.matchedPermission);
  }

  @Get('threads/:id/messages')
  @RequirePermission({ action: 'read', resource: 'communication' })
  listMessages(
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
    @Req() req: any,
  ) {
    return this.service.listMessages(id, query, req.user, req.matchedPermission);
  }

  @Patch('threads/:id')
  @RequirePermission({ action: 'update', resource: 'communication' })
  updateThread(@Param('id') id: string, @Body() dto: UpdateThreadDto, @Req() req: any) {
    return this.service.updateThread(id, dto, req.user, req.matchedPermission);
  }

  @Post('threads/:id/messages')
  @RequirePermission({ action: 'update', resource: 'communication' })
  addMessage(@Param('id') id: string, @Body() dto: CreateMessageDto, @Req() req: any) {
    return this.service.addMessage(id, dto, req.user, req.matchedPermission);
  }

  @Post('threads/:id/participants')
  @RequirePermission({ action: 'update', resource: 'communication' })
  addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto, @Req() req: any) {
    return this.service.addParticipant(id, dto, req.user, req.matchedPermission);
  }

  @Delete('threads/:id/participants/:userId')
  @RequirePermission({ action: 'update', resource: 'communication' })
  removeParticipant(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    return this.service.removeParticipant(id, userId, req.user, req.matchedPermission);
  }

  @Post('threads/:id/assignments')
  @RequirePermission({ action: 'update', resource: 'communication' })
  assign(@Param('id') id: string, @Body() dto: AssignThreadDto, @Req() req: any) {
    return this.service.assign(id, dto, req.user, req.matchedPermission);
  }

  @Delete('threads/:id/assignments/:userId')
  @RequirePermission({ action: 'update', resource: 'communication' })
  unassign(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    return this.service.unassign(id, userId, req.user, req.matchedPermission);
  }


  @Get('notifications')
  @RequirePermission({ action: 'read', resource: 'communication' })
  notifications(@Req() req: any) { return this.service.listNotifications(req.user); }

  @Post('notifications/:id/read')
  @RequirePermission({ action: 'read', resource: 'communication' })
  readNotification(@Param('id') id: string, @Req() req: any) { return this.service.markNotificationRead(id, req.user); }

  @Post('notifications/read-all')
  @RequirePermission({ action: 'read', resource: 'communication' })
  readAllNotifications(@Req() req: any) { return this.service.markAllNotificationsRead(req.user); }

  @Post('threads/:id/attachments')
  @RequirePermission({ action: 'update', resource: 'communication' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  uploadAttachment(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any) {
    return this.service.uploadAttachment(id, file, req.user, req.matchedPermission);
  }

  @Get('attachments/:id')
  @RequirePermission({ action: 'read', resource: 'communication' })
  attachment(@Param('id') id: string, @Req() req: any) {
    return this.service.getAttachment(id, req.user, req.matchedPermission);
  }

  @Post('threads/:id/read')
  @RequirePermission({ action: 'read', resource: 'communication' })
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(id, req.user, req.matchedPermission);
  }
}
