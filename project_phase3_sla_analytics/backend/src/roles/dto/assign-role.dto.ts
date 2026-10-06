import { Type } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @Type(() => String)
  @IsUUID()
  userId: string;

  @Type(() => String)
  @IsUUID()
  roleId: string;
}
