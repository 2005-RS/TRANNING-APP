import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

export function swaggerOperationId(
  controllerKey: string,
  methodKey: string,
): string {
  return `${controllerKey.replace(/Controller$/, '')}_${methodKey}`;
}

export function setupSwagger(app: INestApplication, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Training Platform API')
      .setDescription(
        [
          'REST API for the training, fitness tracking, and nutrition platform.',
          '',
          'Errors use a stable JSON body: statusCode, code, message, path, timestamp, requestId.',
          'See the ErrorResponseDto schema. Access tokens are short-lived JWTs sent as Bearer tokens.',
          'Refresh secrets stay in an HttpOnly cookie and are never returned in JSON.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Short-lived JWT access token',
        },
        'access-token',
      )
      .addCookieAuth('refresh-session', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_session',
        description:
          'HttpOnly refresh session cookie. The raw value is never returned in JSON.',
      })
      .build(),
    {
      extraModels: [ErrorResponseDto],
      operationIdFactory: swaggerOperationId,
    },
  );

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    customSiteTitle: 'Training Platform API',
  });
}
