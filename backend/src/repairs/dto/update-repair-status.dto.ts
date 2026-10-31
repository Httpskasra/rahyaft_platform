/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RepairStatus } from 'src/generated/prisma/enums';

export class UpdateRepairStatusDto {
  @IsEnum(RepairStatus)
  status!: RepairStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
