import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createInfrastructureApp } from './create-infrastructure-app';

describe('Backend foundation (e2e)', () => {
  let app: INestApplication;
  let http: App;

  beforeAll(async () => {
    const ctx = await createInfrastructureApp();
    app = ctx.app;
    http = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes Swagger UI under /api/docs', async () => {
    const response = await request(http).get('/api/docs').expect(200);

    expect(response.text.toLowerCase()).toContain('swagger-ui');
  });

  it('exposes the OpenAPI document', async () => {
    const response = await request(http).get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('Training Platform API');
    expect(response.body.info.version).toBe('1.0.0');
  });

  it('assigns a request ID when none is sent', async () => {
    const response = await request(http).get('/api/docs-json').expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reuses a safe incoming request ID', async () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440000';

    const response = await request(http)
      .get('/api/docs-json')
      .set('x-request-id', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
  });

  it('rejects unknown DTO properties', async () => {
    const response = await request(http)
      .post('/api/v1/validation-probe')
      .send({ name: 'ok', extra: true })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.path).toBe('/api/v1/validation-probe');
    expect(response.body.requestId).toBeDefined();
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });

  it('accepts a valid DTO on the versioned API prefix', async () => {
    await request(http)
      .post('/api/v1/validation-probe')
      .send({ name: 'ok' })
      .expect(201);
  });

  it('returns a consistent 404 payload for unknown routes', async () => {
    const response = await request(http).get('/api/v1/missing').expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
        path: '/api/v1/missing',
      }),
    );
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: expect.any(Number),
        code: expect.any(String),
        message: expect.anything(),
        path: expect.any(String),
        timestamp: expect.any(String),
        requestId: expect.any(String),
      }),
    );
  });

  it('publishes a unique-operationId OpenAPI document with ErrorResponseDto', async () => {
    const response = await request(http).get('/api/docs-json').expect(200);
    const document = response.body as {
      paths: Record<string, Record<string, { operationId?: string }>>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(document.components?.schemas?.ErrorResponseDto).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');

    const operationIds: string[] = [];
    for (const methods of Object.values(document.paths ?? {})) {
      for (const operation of Object.values(methods)) {
        if (operation?.operationId) {
          operationIds.push(operation.operationId);
        }
      }
    }

    expect(operationIds.length).toBeGreaterThan(0);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(operationIds).toContain('ValidationProbe_probe');
  });
});
