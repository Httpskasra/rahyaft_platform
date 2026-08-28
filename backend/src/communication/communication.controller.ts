import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CommunicationService } from './communication.service';
import {
  AddParticipantDto,
  AssignThreadDto,
  CreateMessageDto,
  CreateThreadDto,
  QueryMessagesDto,
  QueryThreadsDto,
  UpdateThreadDto,
} from './dto/communication.dto';

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

  @Post('threads/:id/read')
  @RequirePermission({ action: 'read', resource: 'communication' })
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markRead(id, req.user, req.matchedPermission);
  }
}
