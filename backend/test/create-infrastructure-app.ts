import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { configureApp } from '../src/config/configure-app';
import { AUTH_TEST_ENV } from './auth-test-env';
import { STORAGE_TEST_ENV } from './storage-test-env';
import { validateEnv } from '../src/config/env.validation';
import { ValidationProbeController } from './helpers/validation-probe.controller';

export const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'training',
  DATABASE_USER: 'training',
  DATABASE_PASSWORD: 'changeme',
  DATABASE_SSL: 'false',
  CORS_ORIGIN: 'http://localhost:5173',
  ...AUTH_TEST_ENV,
  ...STORAGE_TEST_ENV,
};

export async function createInfrastructureApp(): Promise<{
  app: INestApplication;
  moduleRef: TestingModule;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        validate: () => validateEnv(TEST_ENV),
      }),
    ],
    controllers: [ValidationProbeController],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return { app, moduleRef };
}
