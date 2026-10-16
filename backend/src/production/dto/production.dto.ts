import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Prisma } from 'src/generated/prisma/client';

export class ProductionChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class ProductionFlowStepDto {
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  formId!: string;

  @IsUUID()
  assigneeUserId!: string;

  @IsOptional()
  @IsUUID()
  supervisorUserId?: string;

  @IsOptional()
  @IsUUID()
  approverUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionChecklistTemplateItemDto)
  checklist?: ProductionChecklistTemplateItemDto[];
}

export class CreateProductionFlowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresQc?: boolean;

  @IsOptional()
  @IsUUID()
  qcAssigneeId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductionFlowStepDto)
  steps!: ProductionFlowStepDto[];
}

export class UpdateProductionFlowDto extends CreateProductionFlowDto {}

export class StartProductionRunDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  productCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  batchNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SubmitProductionStepDto {
  @IsObject()
  data!: Prisma.InputJsonValue;
}

export class ReviewProductionStepDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  action!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class UpdateProductionChecklistDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsBoolean()
  checked!: boolean;
}

export class ReviewProductionQcDto {
  @IsString()
  @IsIn(['PASSED', 'FAILED'])
  status!: 'PASSED' | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}
