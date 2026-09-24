const { Client } = require('pg');
const { execSync } = require('node:child_process');
const path = require('node:path');

function assertSafeName(name) {
  if (name === 'training' || name === 'postgres' || !name.endsWith('_test')) {
    throw new Error(
      `Refusing to prepare database "${name}" for tests. Use a dedicated *_test database.`,
    );
  }
}

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT ??= '3000';
  process.env.DATABASE_HOST ??= 'localhost';
  process.env.DATABASE_PORT ??= '5432';
  process.env.DATABASE_NAME = 'training_test';
  process.env.DATABASE_USER ??= 'training';
  process.env.DATABASE_PASSWORD ??= 'changeme';
  process.env.DATABASE_SSL ??= 'false';
  process.env.CORS_ORIGIN ??= 'http://localhost:5173';
  process.env.JWT_ACCESS_SECRET ??=
    'local-test-jwt-access-secret-value-min-32';
  process.env.JWT_ACCESS_EXPIRES_IN ??= '900';
  process.env.JWT_ACCESS_ISSUER ??= 'training-platform';
  process.env.JWT_ACCESS_AUDIENCE ??= 'training-platform-api';
  process.env.AUTH_REFRESH_TTL_DAYS ??= '30';
  process.env.AUTH_REFRESH_COOKIE_NAME ??= 'refresh_session';
  process.env.AUTH_COOKIE_SECURE ??= 'false';
  process.env.AUTH_COOKIE_SAME_SITE ??= 'lax';
  process.env.OBJECT_STORAGE_DRIVER = 'memory';
  process.env.OBJECT_STORAGE_FORCE_PATH_STYLE ??= 'false';
  process.env.EXERCISE_MEDIA_UPLOAD_TTL_SECONDS ??= '600';
  process.env.EXERCISE_MEDIA_READ_TTL_SECONDS ??= '120';
  process.env.EXERCISE_VIDEO_MAX_BYTES ??= '262144000';
  process.env.EXERCISE_IMAGE_MAX_BYTES ??= '10485760';
  process.env.PROGRESS_PHOTO_MAX_BYTES ??= '10485760';

  const databaseName = process.env.DATABASE_NAME;
  assertSafeName(databaseName);

  const admin = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'training',
    connectionTimeoutMillis: 4000,
  });

  await admin.connect();
  const existing = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName],
  );
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  }
  await admin.end();

  execSync('npm run migration:run', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
};
