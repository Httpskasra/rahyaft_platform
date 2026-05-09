import { IsObject, IsUUID } from 'class-validator';
import { Prisma } from 'src/generated/prisma/client';

export class CreateSubmissionDto {
  @IsUUID()
  formId: string;

  @IsObject()
  data: Prisma.InputJsonValue;
}
