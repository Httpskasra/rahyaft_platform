import { IsString, IsOptional, IsObject, MinLength } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  schema: Record<string, unknown>; // { fields: [{id, type, label, required}] }
}
