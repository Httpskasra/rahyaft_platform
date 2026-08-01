import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponseOptions,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SwaggerErrorResponseDto } from './swagger-error.dto';

const errorResponse = (description: string): ApiResponseOptions => ({
  description,
  type: SwaggerErrorResponseDto,
});

export function ApiStandardResponses(options?: {
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
}) {
  return applyDecorators(
    ApiBadRequestResponse(errorResponse('The request is invalid or DTO validation failed.')),
    ...(options?.unauthorized === false
      ? []
      : [ApiUnauthorizedResponse(errorResponse('Authentication is required or the token is invalid.'))]),
    ...(options?.forbidden === false
      ? []
      : [ApiForbiddenResponse(errorResponse('The authenticated user does not have the required permission.'))]),
    ...(options?.notFound
      ? [ApiNotFoundResponse(errorResponse('The requested resource was not found.'))]
      : []),
    ApiInternalServerErrorResponse(
      errorResponse('An unexpected server error occurred.'),
    ),
  );
}
