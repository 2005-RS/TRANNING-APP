import {
  isSwaggerEnabled,
  NodeEnvironment,
  parseCorsOriginsForRuntime,
  validateEnv,
} from './env.validation';
import { AiProviderName } from '../modules/chat/ai/ai-provider-name.enum';
import { AUTH_TEST_ENV } from '../../test/auth-test-env';
import { STORAGE_TEST_ENV } from '../../test/storage-test-env';

function validEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
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
    ...overrides,
  };
}

function productionEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return validEnv({
    NODE_ENV: 'production',
    CORS_ORIGIN: 'https://app.example.com',
    AUTH_COOKIE_SECURE: 'true',
    JWT_ACCESS_SECRET: 'prod-grade-access-token-signing-key-at-least-32',
    DATABASE_PASSWORD: 'prod-db-pass-not-a-default',
    OBJECT_STORAGE_DRIVER: 's3',
    OBJECT_STORAGE_REGION: 'us-east-1',
    OBJECT_STORAGE_BUCKET: 'training-exercise-media',
    OBJECT_STORAGE_ACCESS_KEY_ID: 'prod-access-key',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: 'prod-secret-access-key',
    AI_PROVIDER: 'deepseek',
    DEEPSEEK_API_KEY: 'unit-test-deepseek-key-not-real',
    DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
    DEEPSEEK_MODEL: 'deepseek-flash',
    ...overrides,
  });
}

describe('validateEnv', () => {
  it('accepts a complete valid configuration', () => {
    const env = validateEnv(validEnv());

    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_PORT).toBe(5432);
    expect(env.DATABASE_SSL).toBe(false);
    expect(env.NODE_ENV).toBe(NodeEnvironment.Development);
  });

  it('treats DATABASE_SSL=false as boolean false', () => {
    const env = validateEnv(validEnv({ DATABASE_SSL: 'false' }));
    expect(env.DATABASE_SSL).toBe(false);
  });

  it('fails fast when PORT is missing', () => {
    const env = validEnv();
    delete env.PORT;

    expect(() => validateEnv(env)).toThrow(/Environment validation failed/);
    expect(() => validateEnv(env)).toThrow(/PORT/);
  });

  it('rejects wildcard CORS in production', () => {
    expect(() =>
      validateEnv(
        productionEnv({
          CORS_ORIGIN: '*',
        }),
      ),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('fails fast when JWT_ACCESS_SECRET is missing', () => {
    const env = validEnv();
    delete env.JWT_ACCESS_SECRET;

    expect(() => validateEnv(env)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('does not fall back to a production CORS wildcard at runtime', () => {
    expect(() =>
      parseCorsOriginsForRuntime('*', NodeEnvironment.Production),
    ).toThrow(/CORS_ORIGIN cannot be \* in production/);
  });

  it('requires AUTH_COOKIE_SECURE in production', () => {
    expect(() =>
      validateEnv(
        productionEnv({
          AUTH_COOKIE_SECURE: 'false',
        }),
      ),
    ).toThrow(/AUTH_COOKIE_SECURE/);
  });

  it('rejects SameSite=None without Secure', () => {
    expect(() =>
      validateEnv(
        validEnv({
          AUTH_COOKIE_SAME_SITE: 'none',
          AUTH_COOKIE_SECURE: 'false',
        }),
      ),
    ).toThrow(/AUTH_COOKIE_SAME_SITE/);
  });

  it('rejects the in-memory object-storage driver in production', () => {
    expect(() =>
      validateEnv(
        productionEnv({
          OBJECT_STORAGE_DRIVER: 'memory',
        }),
      ),
    ).toThrow(/OBJECT_STORAGE_DRIVER/);
  });

  it('rejects placeholder JWT secrets and default database passwords in production', () => {
    expect(() =>
      validateEnv(
        productionEnv({
          JWT_ACCESS_SECRET:
            'local-dev-jwt-access-secret-not-for-production-use',
        }),
      ),
    ).toThrow(/JWT_ACCESS_SECRET/);

    expect(() =>
      validateEnv(
        productionEnv({
          DATABASE_PASSWORD: 'changeme',
        }),
      ),
    ).toThrow(/DATABASE_PASSWORD/);
  });

  it('accepts an explicit production configuration with a strong secret', () => {
    const env = validateEnv(productionEnv());
    expect(env.NODE_ENV).toBe(NodeEnvironment.Production);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.HTTP_JSON_BODY_LIMIT_BYTES).toBe(262144);
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.SWAGGER_ENABLED).toBeUndefined();
  });

  it('disables Swagger by default in production and allows an explicit enable', () => {
    expect(isSwaggerEnabled(NodeEnvironment.Production)).toBe(false);
    expect(isSwaggerEnabled(NodeEnvironment.Production, true)).toBe(true);
    expect(isSwaggerEnabled(NodeEnvironment.Development)).toBe(true);
    expect(isSwaggerEnabled(NodeEnvironment.Test, false)).toBe(false);
  });

  describe('AI provider', () => {
    it('defaults to the mock provider outside production', () => {
      const env = validateEnv(validEnv());
      expect(env.AI_PROVIDER).toBe(AiProviderName.Mock);
      expect(env.AI_REQUEST_TIMEOUT_MS).toBe(30_000);
      expect(env.AI_MAX_HISTORY_MESSAGES).toBe(20);
      expect(env.AI_RATE_LIMIT_PER_MINUTE).toBe(12);
      expect(env.AI_PUBLIC_CHAT_ENABLED).toBe(true);
      expect(env.AI_PUBLIC_RATE_LIMIT_PER_MINUTE).toBe(4);
      expect(env.AI_PUBLIC_DAILY_MESSAGE_LIMIT).toBe(300);
    });

    it('can disable the public assistant', () => {
      expect(
        validateEnv(validEnv({ AI_PUBLIC_CHAT_ENABLED: 'false' }))
          .AI_PUBLIC_CHAT_ENABLED,
      ).toBe(false);
    });

    it.each([
      ['AI_PUBLIC_RATE_LIMIT_PER_MINUTE', '0'],
      ['AI_PUBLIC_RATE_LIMIT_PER_MINUTE', '61'],
      ['AI_PUBLIC_DAILY_MESSAGE_LIMIT', '0'],
      ['AI_PUBLIC_CHAT_ENABLED', 'maybe'],
    ])('rejects %s=%s', (key, value) => {
      expect(() => validateEnv(validEnv({ [key]: value }))).toThrow(
        new RegExp(key),
      );
    });

    it('treats blank AI values as unset', () => {
      const env = validateEnv(
        validEnv({
          AI_PROVIDER: '',
          DEEPSEEK_API_KEY: '',
          DEEPSEEK_BASE_URL: '',
          DEEPSEEK_MODEL: '',
        }),
      );
      expect(env.AI_PROVIDER).toBe(AiProviderName.Mock);
      expect(env.DEEPSEEK_API_KEY).toBeUndefined();
    });

    it('never silently uses mock in production', () => {
      expect(() =>
        validateEnv(productionEnv({ AI_PROVIDER: undefined })),
      ).toThrow(/AI_PROVIDER/);
      expect(() => validateEnv(productionEnv({ AI_PROVIDER: 'mock' }))).toThrow(
        /AI_PROVIDER: mock is not allowed in production/,
      );
    });

    it.each(['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'DEEPSEEK_MODEL'])(
      'requires %s when AI_PROVIDER=deepseek',
      (key) => {
        expect(() =>
          validateEnv(
            validEnv({
              AI_PROVIDER: 'deepseek',
              DEEPSEEK_API_KEY: 'unit-test-deepseek-key-not-real',
              DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
              DEEPSEEK_MODEL: 'deepseek-flash',
              [key]: '',
            }),
          ),
        ).toThrow(new RegExp(key));
      },
    );

    it('requires an https DeepSeek base URL in production', () => {
      expect(() =>
        validateEnv(
          productionEnv({ DEEPSEEK_BASE_URL: 'http://api.deepseek.com' }),
        ),
      ).toThrow(/DEEPSEEK_BASE_URL: must use https/);
    });

    it('rejects an unknown provider and out-of-range limits', () => {
      expect(() => validateEnv(validEnv({ AI_PROVIDER: 'openai' }))).toThrow(
        /AI_PROVIDER/,
      );
      expect(() =>
        validateEnv(validEnv({ AI_MAX_HISTORY_MESSAGES: '500' })),
      ).toThrow(/AI_MAX_HISTORY_MESSAGES/);
    });
  });

  it('rejects non-local S3 endpoints and production-looking buckets in tests', () => {
    expect(() =>
      validateEnv(
        validEnv({
          NODE_ENV: 'test',
          OBJECT_STORAGE_DRIVER: 's3',
          OBJECT_STORAGE_REGION: 'us-east-1',
          OBJECT_STORAGE_BUCKET: 'training-exercise-media',
          OBJECT_STORAGE_ACCESS_KEY_ID: 'test-key',
          OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-secret',
          OBJECT_STORAGE_ENDPOINT: 'https://s3.amazonaws.com',
        }),
      ),
    ).toThrow(/OBJECT_STORAGE_ENDPOINT/);

    expect(() =>
      validateEnv(
        validEnv({
          NODE_ENV: 'test',
          OBJECT_STORAGE_DRIVER: 's3',
          OBJECT_STORAGE_REGION: 'us-east-1',
          OBJECT_STORAGE_BUCKET: 'prod-media',
          OBJECT_STORAGE_ACCESS_KEY_ID: 'test-key',
          OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-secret',
          OBJECT_STORAGE_ENDPOINT: 'http://127.0.0.1:9100',
        }),
      ),
    ).toThrow(/OBJECT_STORAGE_BUCKET/);
  });
});
