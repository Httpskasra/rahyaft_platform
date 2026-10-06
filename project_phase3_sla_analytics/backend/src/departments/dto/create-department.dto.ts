import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
