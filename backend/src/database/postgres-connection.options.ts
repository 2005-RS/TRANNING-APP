import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../config/env.validation';

function createSharedPostgresOptions(
  env: EnvironmentVariables,
): PostgresConnectionOptions {
  const slowQueryMs =
    env.DATABASE_SLOW_QUERY_MS > 0 ? env.DATABASE_SLOW_QUERY_MS : undefined;

  return {
    type: 'postgres',
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    synchronize: false,
    logging:
      env.NODE_ENV === NodeEnvironment.Development
        ? ['error', 'warn']
        : ['error'],
    maxQueryExecutionTime: slowQueryMs,
    extra: {
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: env.DATABASE_CONNECT_TIMEOUT_MS,
      idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
    },
    migrationsTableName: 'typeorm_migrations',
  };
}

export function createTypeOrmNestOptions(
  env: EnvironmentVariables,
): TypeOrmModuleOptions {
  return {
    ...createSharedPostgresOptions(env),
    autoLoadEntities: true,
    migrationsRun: false,
  };
}

export function createTypeOrmCliOptions(
  env: EnvironmentVariables,
): PostgresConnectionOptions {
  return {
    ...createSharedPostgresOptions(env),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
