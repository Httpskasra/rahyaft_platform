import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';

const IR_PHONE_REGEX = /^09[0-9]{9}$/;
export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @Matches(IR_PHONE_REGEX, {
    message: 'phoneNumber must be a valid Iranian mobile number',
  })
  @IsOptional()
  phoneNumber?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;
}
