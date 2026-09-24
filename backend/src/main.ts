import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';
import { EnvironmentVariables, NodeEnvironment } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const production = process.env.NODE_ENV === NodeEnvironment.Production;
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: production
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  configureApp(app);
  app.enableShutdownHooks();

  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const port = config.get('PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
