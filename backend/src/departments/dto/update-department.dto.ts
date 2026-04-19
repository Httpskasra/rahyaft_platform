import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
