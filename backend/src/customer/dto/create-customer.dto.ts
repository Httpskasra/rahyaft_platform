import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'نام و نام خانوادگی الزامی است' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsNotEmpty({ message: 'شماره تلفن الزامی است' })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره تلفن معتبر نیست (مثال: 09123456789)',
  })
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
