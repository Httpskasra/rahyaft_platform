import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { Prisma } from 'src/generated/prisma/client';

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  schema?: Prisma.InputJsonObject;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
