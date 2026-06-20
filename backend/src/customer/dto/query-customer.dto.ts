import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCustomerDto {
  // جستجوی آزاد روی fullName، phoneNumber، companyName، nationalCode
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  nationalCode?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'fullName'])
  sortBy?: 'createdAt' | 'updatedAt' | 'fullName' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
