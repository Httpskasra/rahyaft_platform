import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AddPermissionDto } from './add-permission.dto';

export class SyncPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPermissionDto)
  permissions: AddPermissionDto[];
}
