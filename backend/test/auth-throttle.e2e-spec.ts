import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { assertSafeTestDatabaseName } from '../src/database/assert-safe-test-database';
import {
  AUTH_LOGIN_THROTTLE_LIMIT,
  AUTH_REFRESH_THROTTLE_LIMIT,
} from '../src/modules/auth/auth.constants';

describe('Authentication throttling (e2e)', () => {
  let app: INestApplication;
  let http: App;

  beforeAll(async () => {
    assertSafeTestDatabaseName(process.env.DATABASE_NAME ?? '');
    delete process.env.AUTH_E2E_SKIP_THROTTLE;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after the login route limit', async () => {
    for (let attempt = 0; attempt < AUTH_LOGIN_THROTTLE_LIMIT; attempt += 1) {
      await request(http)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'placeholder-password' })
        .expect(400);
    }

    const blocked = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'placeholder-password' })
      .expect(429);

    expect(blocked.body.statusCode).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
  });

  it('returns 429 after the refresh route limit', async () => {
    for (let attempt = 0; attempt < AUTH_REFRESH_THROTTLE_LIMIT; attempt += 1) {
      await request(http).post('/api/v1/auth/refresh').expect(401);
    }

    const blocked = await request(http)
      .post('/api/v1/auth/refresh')
      .expect(429);

    expect(blocked.body.statusCode).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
  });
});
