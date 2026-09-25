import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded, RequestHandler } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from '../common/interceptors/request-logging.interceptor';
import { requestIdMiddleware } from '../common/middleware/request-id.middleware';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from './app.constants';
import {
  EnvironmentVariables,
  isSwaggerEnabled,
  NodeEnvironment,
  parseCorsOriginsForRuntime,
} from './env.validation';
import { ConfiguredSocketIoAdapter } from './socket-io.adapter';
import { setupSwagger } from './swagger.setup';

function isSwaggerUiPath(path: string): boolean {
  return path === '/api/docs' || path.startsWith('/api/docs/');
}

function securityHeaders(nodeEnv: NodeEnvironment): RequestHandler {
  const production = nodeEnv === NodeEnvironment.Production;
  const apiHelmet = helmet({
    contentSecurityPolicy: true,
    hsts: production,
  });
  const swaggerHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
      },
    },
    hsts: production,
  });

  return (req, res, next) => {
    if (isSwaggerUiPath(req.path)) {
      swaggerHelmet(req, res, next);
      return;
    }

    apiHelmet(req, res, next);
  };
}

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  const bodyLimit = config.get('HTTP_JSON_BODY_LIMIT_BYTES', { infer: true });
  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  const swaggerEnabled = isSwaggerEnabled(
    nodeEnv,
    config.get('SWAGGER_ENABLED', { infer: true }),
  );

  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(securityHeaders(nodeEnv));
  app.use(requestIdMiddleware);
  app.use(cookieParser());

  const allowedOrigins = parseCorsOriginsForRuntime(corsOrigin, nodeEnv);
  app.useWebSocketAdapter(new ConfiguredSocketIoAdapter(app, allowedOrigins));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  setupSwagger(app, swaggerEnabled);
}
