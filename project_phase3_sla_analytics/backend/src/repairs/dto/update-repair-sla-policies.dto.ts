import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { RepairType } from '../../generated/prisma/enums';

class RepairSlaPolicyDto {
  @IsEnum(RepairType)
  type!: RepairType;

  @IsInt()
  @Min(1)
  targetHours!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRepairSlaPoliciesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairSlaPolicyDto)
  policies!: RepairSlaPolicyDto[];
}
