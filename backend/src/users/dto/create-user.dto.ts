import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';

const IR_PHONE_REGEX = /^09[0-9]{9}$/;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(IR_PHONE_REGEX, {
    message:
      'phoneNumber must be a valid Iranian mobile number (e.g. 09121234567)',
  })
  phoneNumber: string;

  @IsUUID()
  departmentId: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;
}
