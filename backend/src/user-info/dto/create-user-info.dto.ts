import { IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRelativeDto {
  @IsString()
  name!: string;

  @IsString()
  relation!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateUserInfoDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() nationalCode?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsString() residence?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() homePhone?: string;

  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() university?: string;
  @IsOptional() @IsString() graduateYear?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRelativeDto)
  relatives?: CreateRelativeDto[];
}