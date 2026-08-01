import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AiInsightLevel } from 'src/generated/prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

export class CreateCustomerAiAnalysisDto {
  @IsString()
  @MaxLength(5000)
  @Transform(emptyToUndefined)
  summary!: string;

  @IsOptional()
  @IsEnum(AiInsightLevel, { message: 'سطح ریسک معتبر نیست' })
  riskLevel?: AiInsightLevel;

  @IsOptional()
  @IsEnum(AiInsightLevel, { message: 'سطح پتانسیل فروش معتبر نیست' })
  salesPotential?: AiInsightLevel;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(emptyToUndefined)
  nextBestAction?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  insights?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  modelName?: string;
}