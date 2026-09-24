import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(path = '/api/v1/health'): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getResponse: () => ({ status }) as unknown as Response,
      getRequest: () => ({
        method: 'GET',
        originalUrl: path,
        requestId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('returns a safe validation-shaped payload for HttpException', () => {
    const { host, status, json } = createHost('/api/v1/probe');

    filter.catch(
      new HttpException(
        { message: ['name should not be empty'], statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: ['name should not be empty'],
        path: '/api/v1/probe',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
  });

  it('does not expose SQL from QueryFailedError', () => {
    const { host, json } = createHost();
    const error = new QueryFailedError(
      'SELECT * FROM secret_table',
      [],
      new Error('relation "secret_table" does not exist'),
    );

    filter.catch(error, host);

    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.code).toBe('DATABASE_ERROR');
    expect(JSON.stringify(body)).not.toContain('SELECT');
    expect(JSON.stringify(body)).not.toContain('secret_table');
  });

  it('does not expose stack traces in the response', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { host, json } = createHost();

    try {
      filter.catch(new Error('boom with stack'), host);
      const body = json.mock.calls[0][0] as Record<string, unknown>;
      expect(body.message).toBe('An unexpected error occurred');
      expect(JSON.stringify(body)).not.toContain('stack');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
