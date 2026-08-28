import { Type } from 'class-transformer';
import {
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
} from 'class-validator';
import {
  ThreadParticipantRole,
  ThreadPriority,
  ThreadStatus,
  ThreadType,
} from '../../generated/prisma/enums';

export class CreateThreadDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsEnum(ThreadType)
  type!: ThreadType;

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
  body!: string;
}

export class AddParticipantDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(ThreadParticipantRole)
  role?: ThreadParticipantRole;
}

export class AssignThreadDto {
  @IsUUID()
  userId!: string;
}
