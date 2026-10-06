/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  CustomerStatus,
  CustomerType,
  Gender,
  OccupationGroup,
} from 'src/generated/prisma/client';

export { CustomerStatus, CustomerType, Gender, OccupationGroup };

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

export class CreateCustomerDto {
  // ─── نوع مشتری ─────────────────────────────────────────────

  @IsOptional()
  @IsEnum(CustomerType, {
    message: 'نوع مشتری باید PERSON یا ORGANIZATION باشد',
  })
  type?: CustomerType;
  @IsOptional()
  @IsEnum(CustomerStatus, { message: 'وضعیت مشتری معتبر نیست' })
  status?: CustomerStatus;

  // ─── اطلاعات شخص حقیقی ─────────────────────────────────────

  @ValidateIf(
    (o: CreateCustomerDto) => !o.type || o.type === CustomerType.PERSON,
  )
  @IsNotEmpty({ message: 'نام برای مشتری حقیقی الزامی است' })
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  firstName?: string;

  @ValidateIf(
    (o: CreateCustomerDto) => !o.type || o.type === CustomerType.PERSON,
  )
  @IsNotEmpty({ message: 'نام خانوادگی برای مشتری حقیقی الزامی است' })
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  lastName?: string;

  @ValidateIf(
    (o: CreateCustomerDto) => !o.type || o.type === CustomerType.PERSON,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  @Transform(emptyToUndefined)
  nationalCode?: string;

  @ValidateIf(
    (o: CreateCustomerDto) => !o.type || o.type === CustomerType.PERSON,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: 'تاریخ تولد باید به فرمت 1370/01/01 باشد',
  })
  @Transform(emptyToUndefined)
  birthDate?: string;

  @ValidateIf(
    (o: CreateCustomerDto) => !o.type || o.type === CustomerType.PERSON,
  )
  @IsOptional()
  @IsEnum(Gender, { message: 'جنسیت باید MALE یا FEMALE باشد' })
  @Transform(emptyToUndefined)
  gender?: Gender;

  // ─── اطلاعات سازمان / شرکت / کلینیک ────────────────────────

  @ValidateIf((o: CreateCustomerDto) => o.type === CustomerType.ORGANIZATION)
  @IsNotEmpty({ message: 'نام سازمان برای مشتری سازمانی الزامی است' })
  @IsString()
  @MaxLength(200)
  @Transform(emptyToUndefined)
  organizationName?: string;

  @ValidateIf((o: CreateCustomerDto) => o.type === CustomerType.ORGANIZATION)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(emptyToUndefined)
  economicCode?: string;

  @ValidateIf((o: CreateCustomerDto) => o.type === CustomerType.ORGANIZATION)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(emptyToUndefined)
  registrationNo?: string;

  @ValidateIf((o: CreateCustomerDto) => o.type === CustomerType.ORGANIZATION)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(emptyToUndefined)
  nationalId?: string;

  // ─── اطلاعات تماس مشترک ────────────────────────────────────

  @IsOptional()
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره موبایل معتبر نیست (مثال: 09123456789)',
  })
  @Transform(emptyToUndefined)
  mobile?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0\d{10}|0\d{2,3}-?\d{7,8})$/, {
    message: 'شماره تلفن معتبر نیست',
  })
  @Transform(emptyToUndefined)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(255)
  @Transform(emptyToUndefined)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(emptyToUndefined)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد پستی باید ۱۰ رقم باشد' })
  @Transform(emptyToUndefined)
  postalCode?: string;

  // ─── دسته‌بندی کاری مشتری برای کارفرما ─────────────────────

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(emptyToUndefined)
  occupation?: string;

  @IsOptional()
  @IsEnum(OccupationGroup, { message: 'گروه شغلی معتبر نیست' })
  @Transform(emptyToUndefined)
  occupationGroup?: OccupationGroup;
}
