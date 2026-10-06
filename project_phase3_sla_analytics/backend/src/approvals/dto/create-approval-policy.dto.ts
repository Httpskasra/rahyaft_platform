/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsArray,
  IsUUID,
  IsInt,
  Min,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class PolicyStepDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;
}

export class CreateApprovalPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  overallSlaHours?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyStepDto)
  steps: PolicyStepDto[];
}
