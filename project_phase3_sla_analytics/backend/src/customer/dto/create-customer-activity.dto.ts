/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CustomerActivityType } from 'src/generated/prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

export class CreateCustomerActivityDto {
  @IsNotEmpty({ message: 'نوع فعالیت الزامی است' })
  @IsEnum(CustomerActivityType, { message: 'نوع فعالیت معتبر نیست' })
  type!: CustomerActivityType;

  @IsNotEmpty({ message: 'عنوان فعالیت الزامی است' })
  @IsString()
  @MaxLength(200)
  @Transform(emptyToUndefined)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  @Transform(emptyToUndefined)
  body?: string;

  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  relatedRepairId?: string;

  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  relatedSalesOpportunityId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ پیگیری معتبر نیست' })
  @Transform(emptyToUndefined)
  dueAt?: string;

  @IsOptional()
  @IsUUID()
  @Transform(emptyToUndefined)
  createdById?: string;
}
