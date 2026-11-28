import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateNested,
} from 'class-validator';
import { EvaluationType, SupplierKind } from '../../../generated/prisma/enums';

export class QuestionGuideDto {
  @ApiProperty({ description: 'راهنمای نمره ۰' }) @IsString() @MinLength(1) '0': string;
  @ApiProperty({ description: 'راهنمای نمره ۱' }) @IsString() @MinLength(1) '1': string;
  @ApiProperty({ description: 'راهنمای نمره ۲' }) @IsString() @MinLength(1) '2': string;
  @ApiProperty({ description: 'راهنمای نمره ۳' }) @IsString() @MinLength(1) '3': string;
}

export class TemplateQuestionDto {
  @ApiProperty({ description: 'شرح سوال' }) @IsString() @MinLength(1) text: string;
  @ApiProperty({ description: 'وزن سوال (> 0)' }) @Type(() => Number) @IsNumber() @Min(0.01) weight: number;
  @ApiProperty({ type: QuestionGuideDto }) @ValidateNested() @Type(() => QuestionGuideDto) guide: QuestionGuideDto;
}

export class SaveTemplateDto {
  @ApiProperty() @IsString() @MinLength(1) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ type: [TemplateQuestionDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TemplateQuestionDto)
  questions: TemplateQuestionDto[];
}

export class AnswerDto {
  @ApiProperty() @IsUUID() questionId: string;
  @ApiProperty({ description: '0 تا 3' }) @Type(() => Number) @IsInt() @Min(0) @Max(3) score: number;
}

export class SubmitEvaluationDto {
  @ApiProperty({ enum: EvaluationType }) @IsEnum(EvaluationType) type: EvaluationType;
  @ApiProperty({ type: [AnswerDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => AnswerDto)
  answers: AnswerDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PreviewEvaluationDto extends SubmitEvaluationDto {
  @ApiProperty({ enum: SupplierKind }) @IsEnum(SupplierKind) supplierKind: SupplierKind;
}

export class ScoreSettingDto {
  @ApiProperty({ description: 'حداقل نمره برای لیبل سفید (پیش‌فرض ۶۰)' })
  @Type(() => Number) @IsNumber() @Min(1) @Max(100) whiteMin: number;
  @ApiProperty({ description: 'حداقل نمره برای لیبل خاکستری (پیش‌فرض ۴۰)' })
  @Type(() => Number) @IsNumber() @Min(0) @Max(99) grayMin: number;
}
