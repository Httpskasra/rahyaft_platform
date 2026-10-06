import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { RepairType } from '../enums/repair-type.enum';

export class CreateRepairDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  deviceTitle!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsString()
  problemDescription!: string;

  @IsEnum(RepairType)
  type!: RepairType;
}