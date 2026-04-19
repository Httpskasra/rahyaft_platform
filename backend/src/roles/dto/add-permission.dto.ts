import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ScopeType, DepartmentRelationType } from 'src/generated/prisma/enums';

export class AddPermissionDto {
  @IsString()
  action: string;

  @IsString()
  resource: string;

  @IsEnum(ScopeType)
  scope: ScopeType;

  @IsEnum(DepartmentRelationType)
  @IsOptional()
  relationType?: DepartmentRelationType;

  @IsObject()
  @IsOptional()
  constraints?: Record<string, unknown>;
}
