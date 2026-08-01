/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import {
  SwaggerErrorResponseDto,
  SwaggerValidationErrorDto,
} from '../../common/swagger/swagger-error.dto';

const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const enabled =
    configService.get<string>('SWAGGER_ENABLED', 'true') === 'true';

  if (!enabled) return;

  const apiVersion = configService.get<string>('API_VERSION', '1.0.0');
  const publicBaseUrl = configService.get<string>('PUBLIC_API_URL');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const builder = new DocumentBuilder()
    .setTitle('Enterprise CRM API')
    .setDescription(
      [
        'Production API documentation for the Enterprise CRM platform.',
        '',
        '### Authentication',
        'Most endpoints require a JWT access token. Use **Authorize** and enter the token without the `Bearer` prefix.',
        '',
        '### Authorization',
        'Protected operations are additionally checked by the role/permission guard.',
        '',
        '### API prefix',
        'All business endpoints are served under `/api/v1`.',
      ].join('\n'),
    )
    .setVersion(apiVersion)
    .setContact('Backend Team', '', 'backend@example.com')
    .setLicense('Proprietary', '')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag(
      'Authentication',
      'OTP login, token rotation, logout, and current-user operations',
    )
    .addTag('Users', 'User lifecycle and account administration')
    .addTag('Roles', 'Roles, permissions, scopes, and role assignment')
    .addTag('Departments', 'Department hierarchy and relations')
    .addTag('Forms', 'Dynamic form definitions and analytics')
    .addTag('Form Submissions', 'Form submission lifecycle')
    .addTag('Approvals', 'Approval policies and submission approval workflow')
    .addTag(
      'Customers',
      'CRM customers, contacts, opportunities, activities, and AI analysis',
    )
    .addTag('Repairs', 'Repair cases, assignment, and status transitions')
    .addTag('Attendance', 'Excel attendance import and reporting')
    .addTag('User Profile', 'Authenticated user profile information')
    .addTag('Bale', 'Bale messenger webhook integration')
    .addTag('Health', 'Service liveness endpoint');

  if (publicBaseUrl) builder.addServer(publicBaseUrl, 'Configured environment');
  builder.addServer('http://localhost:3000', 'Local development');

  const documentOptions: SwaggerDocumentOptions = {
    deepScanRoutes: true,
    extraModels: [SwaggerErrorResponseDto, SwaggerValidationErrorDto],
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  };

  const document = SwaggerModule.createDocument(
    app,
    builder.build(),
    documentOptions,
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}/openapi.json`,
    yamlDocumentUrl: `${SWAGGER_PATH}/openapi.yaml`,
    customSiteTitle: 'Enterprise CRM API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      deepLinking: true,
      docExpansion: 'none',
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 32px 0; }
      .swagger-ui .scheme-container { position: sticky; top: 0; z-index: 20; }
      .swagger-ui .opblock-tag { font-size: 22px; }
    `,
  });

  Logger.log(`Swagger UI available at /${SWAGGER_PATH}`, 'Swagger');
}
