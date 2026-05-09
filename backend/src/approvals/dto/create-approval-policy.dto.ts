/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsArray,
  IsUUID,
  IsInt,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PolicyStepDto {
  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsUUID()
  roleId: string;
}

export class CreateApprovalPolicyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyStepDto)
  steps: PolicyStepDto[];
}
