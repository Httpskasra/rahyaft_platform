import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EvaluationKind } from '../../../generated/prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class KindParamDto {
  @IsEnum(EvaluationKind, { message: 'نوع فرم باید INITIAL یا PERIODIC باشد' })
  kind!: EvaluationKind;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(emptyToUndefined)
  description?: string;

  /** حداقل نمره لیبل سفید (پیش‌فرض ۶۰) */
  @IsOptional() @IsNumber() @Min(0) @Max(100) whiteMinScore?: number;

  /** حداقل نمره لیبل خاکستری (پیش‌فرض ۴۰) */
  @IsOptional() @IsNumber() @Min(0) @Max(100) grayMinScore?: number;
}

export class CreateQuestionDto {
  @IsNotEmpty({ message: 'شرح سوال الزامی است' })
  @IsString()
  @MaxLength(1000)
  title!: string;

  @IsOptional() @IsString() @MaxLength(2000) @Transform(emptyToUndefined) helpText?: string;

  @IsOptional() @IsNumber() @Min(0.01) @Max(1000) weight?: number;

  /** راهنمای هر نمره برای اپراتور */
  @IsOptional() @IsString() @MaxLength(1000) @Transform(emptyToUndefined) guideScore0?: string;
  @IsOptional() @IsString() @MaxLength(1000) @Transform(emptyToUndefined) guideScore1?: string;
  @IsOptional() @IsString() @MaxLength(1000) @Transform(emptyToUndefined) guideScore2?: string;
  @IsOptional() @IsString() @MaxLength(1000) @Transform(emptyToUndefined) guideScore3?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateQuestionDto extends CreateQuestionDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  declare title: string;
}

export class ReorderQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  questionIds!: string[];
}

export class AnswerDto {
  @IsUUID() questionId!: string;

  @Type(() => Number)
  @IsInt({ message: 'نمره باید عدد صحیح باشد' })
  @Min(0, { message: 'نمره باید بین ۰ تا ۳ باشد' })
  @Max(3, { message: 'نمره باید بین ۰ تا ۳ باشد' })
  score!: number;

  @IsOptional() @IsString() @MaxLength(1000) @Transform(emptyToUndefined) note?: string;
}

export class SubmitEvaluationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];

  @IsOptional() @IsString() @MaxLength(2000) @Transform(emptyToUndefined) note?: string;
}
