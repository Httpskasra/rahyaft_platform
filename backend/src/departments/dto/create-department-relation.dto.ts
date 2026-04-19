import { IsUUID, IsEnum } from 'class-validator';
import { DepartmentRelationType } from 'src/generated/prisma/enums';

export class CreateDepartmentRelationDto {
  @IsUUID()
  fromDepartmentId: string;

  @IsUUID()
  toDepartmentId: string;

  @IsEnum(DepartmentRelationType)
  type: DepartmentRelationType;
}
