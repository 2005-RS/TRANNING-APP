import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

export function readEnvironment(
  config: ConfigService<EnvironmentVariables, true>,
): EnvironmentVariables {
  return {
    NODE_ENV: config.getOrThrow('NODE_ENV', { infer: true }),
    PORT: config.getOrThrow('PORT', { infer: true }),
    TRUST_PROXY: config.getOrThrow('TRUST_PROXY', { infer: true }),
    HTTP_JSON_BODY_LIMIT_BYTES: config.getOrThrow(
      'HTTP_JSON_BODY_LIMIT_BYTES',
      { infer: true },
    ),
    SWAGGER_ENABLED: config.get('SWAGGER_ENABLED', { infer: true }),
    DATABASE_HOST: config.getOrThrow('DATABASE_HOST', { infer: true }),
    DATABASE_PORT: config.getOrThrow('DATABASE_PORT', { infer: true }),
    DATABASE_NAME: config.getOrThrow('DATABASE_NAME', { infer: true }),
    DATABASE_USER: config.getOrThrow('DATABASE_USER', { infer: true }),
    DATABASE_PASSWORD: config.getOrThrow('DATABASE_PASSWORD', { infer: true }),
    DATABASE_SSL: config.getOrThrow('DATABASE_SSL', { infer: true }),
    DATABASE_POOL_MAX: config.getOrThrow('DATABASE_POOL_MAX', { infer: true }),
    DATABASE_CONNECT_TIMEOUT_MS: config.getOrThrow(
      'DATABASE_CONNECT_TIMEOUT_MS',
      { infer: true },
    ),
    DATABASE_IDLE_TIMEOUT_MS: config.getOrThrow('DATABASE_IDLE_TIMEOUT_MS', {
      infer: true,
    }),
    DATABASE_SLOW_QUERY_MS: config.getOrThrow('DATABASE_SLOW_QUERY_MS', {
      infer: true,
    }),
    CORS_ORIGIN: config.getOrThrow('CORS_ORIGIN', { infer: true }),
    JWT_ACCESS_SECRET: config.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
    JWT_ACCESS_EXPIRES_IN: config.getOrThrow('JWT_ACCESS_EXPIRES_IN', {
      infer: true,
    }),
    JWT_ACCESS_ISSUER: config.getOrThrow('JWT_ACCESS_ISSUER', { infer: true }),
    JWT_ACCESS_AUDIENCE: config.getOrThrow('JWT_ACCESS_AUDIENCE', {
      infer: true,
    }),
    AUTH_REFRESH_TTL_DAYS: config.getOrThrow('AUTH_REFRESH_TTL_DAYS', {
      infer: true,
    }),
    AUTH_REFRESH_COOKIE_NAME: config.getOrThrow('AUTH_REFRESH_COOKIE_NAME', {
      infer: true,
    }),
    AUTH_COOKIE_SECURE: config.getOrThrow('AUTH_COOKIE_SECURE', {
      infer: true,
    }),
    AUTH_COOKIE_SAME_SITE: config.getOrThrow('AUTH_COOKIE_SAME_SITE', {
      infer: true,
    }),
    OBJECT_STORAGE_DRIVER: config.getOrThrow('OBJECT_STORAGE_DRIVER', {
      infer: true,
    }),
    OBJECT_STORAGE_REGION: config.get('OBJECT_STORAGE_REGION', { infer: true }),
    OBJECT_STORAGE_BUCKET: config.get('OBJECT_STORAGE_BUCKET', { infer: true }),
    OBJECT_STORAGE_ACCESS_KEY_ID: config.get('OBJECT_STORAGE_ACCESS_KEY_ID', {
      infer: true,
    }),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: config.get(
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
      { infer: true },
    ),
    OBJECT_STORAGE_ENDPOINT: config.get('OBJECT_STORAGE_ENDPOINT', {
      infer: true,
    }),
    OBJECT_STORAGE_FORCE_PATH_STYLE: config.getOrThrow(
      'OBJECT_STORAGE_FORCE_PATH_STYLE',
      { infer: true },
    ),
    EXERCISE_MEDIA_UPLOAD_TTL_SECONDS: config.getOrThrow(
      'EXERCISE_MEDIA_UPLOAD_TTL_SECONDS',
      { infer: true },
    ),
    EXERCISE_MEDIA_READ_TTL_SECONDS: config.getOrThrow(
      'EXERCISE_MEDIA_READ_TTL_SECONDS',
      { infer: true },
    ),
    EXERCISE_VIDEO_MAX_BYTES: config.getOrThrow('EXERCISE_VIDEO_MAX_BYTES', {
      infer: true,
    }),
    EXERCISE_IMAGE_MAX_BYTES: config.getOrThrow('EXERCISE_IMAGE_MAX_BYTES', {
      infer: true,
    }),
    PROGRESS_PHOTO_MAX_BYTES: config.getOrThrow('PROGRESS_PHOTO_MAX_BYTES', {
      infer: true,
    }),
  };
}
