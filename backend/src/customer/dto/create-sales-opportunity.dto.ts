import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  SalesOpportunityPriority,
  SalesOpportunityStatus,
} from 'src/generated/prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

export class CreateSalesOpportunityDto {
  @IsNotEmpty({ message: 'عنوان فرصت فروش الزامی است' })
  @IsString()
  @MaxLength(200)
  @Transform(emptyToUndefined)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(emptyToUndefined)
  description?: string;

  @IsOptional()
  @IsEnum(SalesOpportunityStatus, { message: 'وضعیت فرصت فروش معتبر نیست' })
  status?: SalesOpportunityStatus;

  @IsOptional()
  @IsEnum(SalesOpportunityPriority, { message: 'اولویت فرصت فروش معتبر نیست' })
  priority?: SalesOpportunityPriority;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'مبلغ تخمینی باید عدد باشد' })
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'احتمال فروش باید عدد صحیح باشد' })
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ پیش‌بینی فروش معتبر نیست' })
  @Transform(emptyToUndefined)
  expectedCloseAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ پیگیری بعدی معتبر نیست' })
  @Transform(emptyToUndefined)
  nextFollowUpAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(emptyToUndefined)
  lossReason?: string;
}