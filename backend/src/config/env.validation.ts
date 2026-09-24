import 'reflect-metadata';
import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  validateSync,
  ValidateIf,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  DATABASE_CONNECT_TIMEOUT_MS_DEFAULT,
  DATABASE_IDLE_TIMEOUT_MS_DEFAULT,
  DATABASE_POOL_MAX_DEFAULT,
  HTTP_JSON_BODY_LIMIT_BYTES_DEFAULT,
} from './app.constants';
import { ObjectStorageDriver } from '../storage/object-storage-driver.enum';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum CookieSameSite {
  Lax = 'lax',
  Strict = 'strict',
  None = 'none',
}

const HTTP_ORIGIN_PATTERN = /^https?:\/\/[^/\s]+$/;

function IsCorsOriginList(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isCorsOriginList',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== 'string' || value.trim() === '') {
            return false;
          }

          const origins = parseCorsOrigins(value);
          if (origins.length === 0) {
            return false;
          }

          const nodeEnv = (args.object as EnvironmentVariables).NODE_ENV;

          for (const origin of origins) {
            if (origin === '*') {
              return nodeEnv !== NodeEnvironment.Production;
            }

            if (!HTTP_ORIGIN_PATTERN.test(origin)) {
              return false;
            }

            try {
              const url = new URL(origin);
              if (url.origin !== origin) {
                return false;
              }
            } catch {
              return false;
            }
          }

          return true;
        },
        defaultMessage(): string {
          return 'CORS_ORIGIN must be a comma-separated list of absolute http(s) origins (no path). Wildcard * is not allowed in production.';
        },
      },
    });
  };
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function toBoolean(value: unknown): unknown {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === '0') {
    return false;
  }

  return value;
}

function toIntWithDefault(defaultValue: number) {
  return ({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return toPort(value);
  };
}

function toOptionalBoolean({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return toBoolean(value);
}

const WEAK_JWT_MARKERS = [
  'changeme',
  'replace-with',
  'local-dev',
  'local-test',
  'example',
  'not-for-production',
  'secret-value',
  'your-secret',
  'jwt_secret',
  'jwt-secret',
];

const WEAK_DATABASE_PASSWORDS = new Set([
  'changeme',
  'postgres',
  'password',
  'training',
  'admin',
  'secret',
  'pass',
  'root',
  '123456',
]);

export function isWeakProductionJwtSecret(secret: string): boolean {
  if (secret.length < 32) {
    return true;
  }

  const lower = secret.toLowerCase();
  return WEAK_JWT_MARKERS.some((marker) => lower.includes(marker));
}

function toPort(value: unknown): unknown {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return value;
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @Transform(({ value }) => toBoolean(value ?? false))
  @IsBoolean()
  TRUST_PROXY!: boolean;

  @Transform(toIntWithDefault(HTTP_JSON_BODY_LIMIT_BYTES_DEFAULT))
  @IsInt()
  @Min(1024)
  @Max(1_048_576)
  HTTP_JSON_BODY_LIMIT_BYTES!: number;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  DATABASE_SSL!: boolean;

  @Transform(toIntWithDefault(DATABASE_POOL_MAX_DEFAULT))
  @IsInt()
  @Min(2)
  @Max(100)
  DATABASE_POOL_MAX!: number;

  @Transform(toIntWithDefault(DATABASE_CONNECT_TIMEOUT_MS_DEFAULT))
  @IsInt()
  @Min(1000)
  @Max(60_000)
  DATABASE_CONNECT_TIMEOUT_MS!: number;

  @Transform(toIntWithDefault(DATABASE_IDLE_TIMEOUT_MS_DEFAULT))
  @IsInt()
  @Min(1000)
  @Max(600_000)
  DATABASE_IDLE_TIMEOUT_MS!: number;

  @Transform(toIntWithDefault(0))
  @IsInt()
  @Min(0)
  @Max(60_000)
  DATABASE_SLOW_QUERY_MS!: number;

  @IsString()
  @IsNotEmpty()
  @IsCorsOriginList()
  CORS_ORIGIN!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(60)
  @Max(3600)
  JWT_ACCESS_EXPIRES_IN!: number;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_AUDIENCE!: string;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  @Max(90)
  AUTH_REFRESH_TTL_DAYS!: number;

  @IsString()
  @IsNotEmpty()
  AUTH_REFRESH_COOKIE_NAME!: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  AUTH_COOKIE_SECURE!: boolean;

  @IsEnum(CookieSameSite)
  AUTH_COOKIE_SAME_SITE!: CookieSameSite;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  INITIAL_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  INITIAL_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  INITIAL_ADMIN_FIRST_NAME?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  INITIAL_ADMIN_LAST_NAME?: string;

  @IsEnum(ObjectStorageDriver)
  OBJECT_STORAGE_DRIVER!: ObjectStorageDriver;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.S3,
  )
  @IsString()
  @IsNotEmpty()
  OBJECT_STORAGE_REGION?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.S3,
  )
  @IsString()
  @IsNotEmpty()
  OBJECT_STORAGE_BUCKET?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.S3,
  )
  @IsString()
  @IsNotEmpty()
  OBJECT_STORAGE_ACCESS_KEY_ID?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.S3,
  )
  @IsString()
  @IsNotEmpty()
  OBJECT_STORAGE_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  OBJECT_STORAGE_ENDPOINT?: string;

  @Transform(({ value }) => toBoolean(value ?? false))
  @IsBoolean()
  OBJECT_STORAGE_FORCE_PATH_STYLE!: boolean;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(300)
  @Max(900)
  EXERCISE_MEDIA_UPLOAD_TTL_SECONDS!: number;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(60)
  @Max(900)
  EXERCISE_MEDIA_READ_TTL_SECONDS!: number;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  EXERCISE_VIDEO_MAX_BYTES!: number;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  EXERCISE_IMAGE_MAX_BYTES!: number;

  @Transform(({ value }) => toPort(value))
  @IsInt()
  @Min(1)
  PROGRESS_PHOTO_MAX_BYTES!: number;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const withDefaults: Record<string, unknown> = {
    ...config,
    TRUST_PROXY: config.TRUST_PROXY ?? false,
    HTTP_JSON_BODY_LIMIT_BYTES:
      config.HTTP_JSON_BODY_LIMIT_BYTES ?? HTTP_JSON_BODY_LIMIT_BYTES_DEFAULT,
    DATABASE_POOL_MAX: config.DATABASE_POOL_MAX ?? DATABASE_POOL_MAX_DEFAULT,
    DATABASE_CONNECT_TIMEOUT_MS:
      config.DATABASE_CONNECT_TIMEOUT_MS ?? DATABASE_CONNECT_TIMEOUT_MS_DEFAULT,
    DATABASE_IDLE_TIMEOUT_MS:
      config.DATABASE_IDLE_TIMEOUT_MS ?? DATABASE_IDLE_TIMEOUT_MS_DEFAULT,
    DATABASE_SLOW_QUERY_MS: config.DATABASE_SLOW_QUERY_MS ?? 0,
  };

  const validated = plainToInstance(EnvironmentVariables, withDefaults, {
    excludeExtraneousValues: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'invalid value';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${details}`);
  }

  if (
    validated.AUTH_COOKIE_SAME_SITE === CookieSameSite.None &&
    !validated.AUTH_COOKIE_SECURE
  ) {
    throw new Error(
      'Environment validation failed:\nAUTH_COOKIE_SAME_SITE: none requires AUTH_COOKIE_SECURE=true',
    );
  }

  if (validated.NODE_ENV === NodeEnvironment.Production) {
    if (!validated.AUTH_COOKIE_SECURE) {
      throw new Error(
        'Environment validation failed:\nAUTH_COOKIE_SECURE: must be true in production',
      );
    }

    if (isWeakProductionJwtSecret(validated.JWT_ACCESS_SECRET)) {
      throw new Error(
        'Environment validation failed:\nJWT_ACCESS_SECRET: production secret is too weak',
      );
    }

    if (
      WEAK_DATABASE_PASSWORDS.has(validated.DATABASE_PASSWORD.toLowerCase())
    ) {
      throw new Error(
        'Environment validation failed:\nDATABASE_PASSWORD: production password is too weak',
      );
    }

    if (validated.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.Memory) {
      throw new Error(
        'Environment validation failed:\nOBJECT_STORAGE_DRIVER: memory is not allowed in production',
      );
    }
  }

  if (
    validated.NODE_ENV === NodeEnvironment.Test &&
    validated.OBJECT_STORAGE_DRIVER === ObjectStorageDriver.S3
  ) {
    const endpoint = validated.OBJECT_STORAGE_ENDPOINT ?? '';
    if (!endpoint.includes('localhost') && !endpoint.includes('127.0.0.1')) {
      throw new Error(
        'Environment validation failed:\nOBJECT_STORAGE_ENDPOINT: tests must use a local object-storage endpoint',
      );
    }
    if (/prod/i.test(validated.OBJECT_STORAGE_BUCKET ?? '')) {
      throw new Error(
        'Environment validation failed:\nOBJECT_STORAGE_BUCKET: tests must not use a production-looking bucket',
      );
    }
  }

  return validated;
}

export function parseCorsOriginsForRuntime(
  corsOrigin: string,
  nodeEnv: NodeEnvironment,
): string[] | true {
  const origins = parseCorsOrigins(corsOrigin);

  if (origins.includes('*')) {
    if (nodeEnv === NodeEnvironment.Production) {
      throw new Error('CORS_ORIGIN cannot be * in production');
    }

    return true;
  }

  return origins;
}

export function isSwaggerEnabled(
  nodeEnv: NodeEnvironment,
  swaggerEnabled?: boolean,
): boolean {
  if (swaggerEnabled !== undefined) {
    return swaggerEnabled;
  }

  return nodeEnv !== NodeEnvironment.Production;
}
