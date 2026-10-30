import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSignatureChangeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
