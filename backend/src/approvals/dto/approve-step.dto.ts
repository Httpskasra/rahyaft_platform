/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApprovalStatus } from '../../generated/prisma/enums';

export class ApproveStepDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsEnum(ApprovalStatus)
  action: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  comments?: string;
}
