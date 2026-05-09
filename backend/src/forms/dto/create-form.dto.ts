import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';
import { Prisma } from 'src/generated/prisma/client';
export class CreateFormDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  schema: Prisma.InputJsonObject; // { fields: [{id, type, label, required}] }
}
