import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwaggerValidationErrorDto {
  @ApiProperty({ example: 'phoneNumber' })
  property!: string;

  @ApiProperty({
    type: [String],
    example: ['phoneNumber must match /^09\\d{9}$/ regular expression'],
  })
  messages!: string[];
}

export class SwaggerErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string | string[];

  @ApiPropertyOptional({ example: '/api/v1/users' })
  path?: string;

  @ApiPropertyOptional({ example: '2026-08-01T12:00:00.000Z' })
  timestamp?: string;

  @ApiPropertyOptional({ type: [SwaggerValidationErrorDto] })
  details?: SwaggerValidationErrorDto[];
}
