import { IsString, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @MinLength(2)
  name: string;
}
