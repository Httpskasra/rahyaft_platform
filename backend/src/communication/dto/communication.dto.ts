import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ThreadEntityType,
  ThreadParticipantRole,
  ThreadPriority,
  ThreadStatus,
  ThreadType,
} from '../../generated/prisma/enums';


export class ThreadEntityLinkInputDto {
  @IsEnum(ThreadEntityType)
  entityType: ThreadEntityType;

  @IsUUID()
  entityId: string;
}

export class CreateThreadDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsEnum(ThreadType)
  type: ThreadType;

  @IsOptional()
  @IsEnum(ThreadPriority)
  priority?: ThreadPriority;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  participantIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  initialMessage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique((link: ThreadEntityLinkInputDto) => `${link.entityType}:${link.entityId}`)
  @ValidateNested({ each: true })
  @Type(() => ThreadEntityLinkInputDto)
  entityLinks?: ThreadEntityLinkInputDto[];
}

export class QueryThreadsDto {
  @IsOptional()
  @IsIn(['inbox', 'assigned', 'created', 'waiting', 'resolved'])
  view?: 'inbox' | 'assigned' | 'created' | 'waiting' | 'resolved';

  @IsOptional()
  @IsEnum(ThreadStatus)
  status?: ThreadStatus;

  @IsOptional()
  @IsEnum(ThreadPriority)
  priority?: ThreadPriority;

  @IsOptional()
  @IsEnum(ThreadType)
  type?: ThreadType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  participantId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  hasAttachment?: 'true' | 'false';

  @IsOptional()
  @IsEnum(ThreadEntityType)
  entityType?: ThreadEntityType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 30;
}


export class QueryMessagesDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}

export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(ThreadStatus)
  status?: ThreadStatus;

  @IsOptional()
  @IsEnum(ThreadPriority)
  priority?: ThreadPriority;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  mentionUserIds?: string[];
}

export class AddParticipantDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ThreadParticipantRole)
  role?: ThreadParticipantRole;
}

export class AssignThreadDto {
  @IsUUID()
  userId: string;
}


export class AddEntityLinkDto extends ThreadEntityLinkInputDto {}

export class QueryEntitySearchDto {
  @IsEnum(ThreadEntityType)
  type: ThreadEntityType;

  @IsOptional()
  @IsString()
  search?: string;
}
