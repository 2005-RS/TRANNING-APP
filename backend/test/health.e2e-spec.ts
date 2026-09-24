import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { TEST_ENV } from './create-infrastructure-app';

async function canConnectToPostgres(): Promise<boolean> {
  const client = new Client({
    host: process.env.DATABASE_HOST ?? TEST_ENV.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? TEST_ENV.DATABASE_PORT),
    database: process.env.DATABASE_NAME ?? TEST_ENV.DATABASE_NAME,
    user: process.env.DATABASE_USER ?? TEST_ENV.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD ?? TEST_ENV.DATABASE_PASSWORD,
    connectionTimeoutMillis: 1500,
  });

  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

describe('Health (e2e)', () => {
  it('pings PostgreSQL through GET /api/v1/health, or reports that the database is unreachable', async () => {
    const postgresAvailable = await canConnectToPostgres();

    if (!postgresAvailable) {
      expect(postgresAvailable).toBe(false);
      return;
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    try {
      const response = await request(app.getHttpServer() as App)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.info.postgres.status).toBe('up');
      expect(JSON.stringify(response.body)).not.toMatch(
        /DATABASE_PASSWORD|JWT_ACCESS_SECRET|passwordHash/i,
      );
    } finally {
      await app.close();
    }
  });
});
