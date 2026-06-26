import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum OccupationGroup {
  HAIR_TRANSPLANT_TECHNICIAN = 'HAIR_TRANSPLANT_TECHNICIAN',   // تکنسین کاشت مو
  NAIL_TECHNICIAN = 'NAIL_TECHNICIAN',                         // تکنسین کاشت ناخن
  GENERAL_PRACTITIONER = 'GENERAL_PRACTITIONER',               // پزشک عمومی
  PHYSICIAN = 'PHYSICIAN',                                     // پزشک
  HAIR_BEAUTY_CLINIC = 'HAIR_BEAUTY_CLINIC',                   // کلینیک کاشت مو و زیبایی
  HOME_DEVICE_CUSTOMER = 'HOME_DEVICE_CUSTOMER',               // مشتری حضوری دستگاه خانگی
  BARBER = 'BARBER',                                           // آرایشگر
  DENTIST = 'DENTIST',                                         // دندانپزشک
  VETERINARIAN = 'VETERINARIAN',                               // دامپزشک
  COLLEAGUE = 'COLLEAGUE',                                     // همکار
  EMPLOYEE = 'EMPLOYEE',                                       // کارمند
  DERMATOLOGIST = 'DERMATOLOGIST',                             // متخصص پوست و مو
  GYNECOLOGIST = 'GYNECOLOGIST',                               // متخصص زنان
  OTHER = 'OTHER',                                             // سایر
}

export class CreateCustomerDto {
  // ─── اطلاعات شخصی (اجباری) ───────────────────────────────

  @IsNotEmpty({ message: 'نام الزامی است' })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsNotEmpty({ message: 'نام خانوادگی الزامی است' })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsNotEmpty({ message: 'شماره موبایل الزامی است' })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'شماره موبایل معتبر نیست (مثال: 09123456789)',
  })
  mobile!: string;

  @IsNotEmpty({ message: 'شماره تلفن الزامی است' })
  @IsString()
  @Matches(/^(0\d{10}|0\d{2,3}-?\d{7,8})$/, {
    message: 'شماره تلفن معتبر نیست',
  })
  phone!: string;

  @IsNotEmpty({ message: 'کد ملی الزامی است' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalCode!: string;

  @IsNotEmpty({ message: 'تاریخ تولد الزامی است' })
  @IsString()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: 'تاریخ تولد باید به فرمت 1370/01/01 باشد',
  })
  birthDate!: string;

  @IsNotEmpty({ message: 'جنسیت الزامی است' })
  @IsEnum(Gender, { message: 'جنسیت باید MALE یا FEMALE باشد' })
  gender!: Gender;

  // ─── اطلاعات جغرافیایی (اجباری) ─────────────────────────

  @IsNotEmpty({ message: 'استان الزامی است' })
  @IsString()
  @MaxLength(100)
  province!: string;

  @IsNotEmpty({ message: 'شهر الزامی است' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @IsNotEmpty({ message: 'آدرس الزامی است' })
  @IsString()
  @MaxLength(1000)
  address!: string;

  // ─── اطلاعات شغلی (اجباری) ───────────────────────────────

  @IsNotEmpty({ message: 'شغل الزامی است' })
  @IsString()
  @MaxLength(200)
  occupation!: string;

  @IsNotEmpty({ message: 'گروه شغلی الزامی است' })
  @IsEnum(OccupationGroup, { message: 'گروه شغلی معتبر نیست' })
  occupationGroup!: OccupationGroup;

  // ─── اطلاعات اختیاری ─────────────────────────────────────

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد پستی باید ۱۰ رقم باشد' })
  postalCode?: string;
}