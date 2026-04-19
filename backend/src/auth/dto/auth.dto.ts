import { IsString, Matches } from 'class-validator';

/**
 * Iranian mobile numbers:
 *  - Start with 09
 *  - Followed by 9 digits
 *  - Examples: 09121234567, 09301234567
 */
const IR_PHONE_REGEX = /^09[0-9]{9}$/;
export class SendOtpDto {
  @IsString()
  @Matches(IR_PHONE_REGEX, {
    message:
      'phoneNumber must be a valid Iranian mobile number (e.g. 09121234567)',
  })
  phoneNumber: string;
}
export class VerifyOtpDto {
  @IsString()
  @Matches(IR_PHONE_REGEX, {
    message:
      'phoneNumber must be a valid Iranian mobile number (e.g. 09121234567)',
  })
  phoneNumber: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'otp must be exactly 6 digits' })
  otp: string;
}
// export class RegisterDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   @MinLength(6)
//   password: string;

//   @IsString()
//   name: string;

//   @IsString()
//   departmentId: string;

//   @IsUUID()
//   @IsOptional()
//   managerId?: string;
// }

// export class LoginDto {
//   @IsEmail()
//   email: string;

//   @IsString()
//   password: string;
// }

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
