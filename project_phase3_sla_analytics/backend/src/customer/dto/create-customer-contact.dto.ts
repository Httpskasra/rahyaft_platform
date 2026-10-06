import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (value === '' || value === null) return undefined;
  return value;
};

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateCustomerContactDto {
  @IsNotEmpty({ message: 'نام مخاطب الزامی است' })
  @IsString()
  @MaxLength(150)
  @Transform(emptyToUndefined)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(emptyToUndefined)
  role?: string;

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
  @Transform(toBoolean)
  @IsBoolean()
  isPrimary?: boolean;
}
