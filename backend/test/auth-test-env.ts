export const AUTH_TEST_ENV = {
  JWT_ACCESS_SECRET: 'local-test-jwt-access-secret-value-min-32',
  JWT_ACCESS_EXPIRES_IN: '900',
  JWT_ACCESS_ISSUER: 'training-platform',
  JWT_ACCESS_AUDIENCE: 'training-platform-api',
  AUTH_REFRESH_TTL_DAYS: '30',
  AUTH_REFRESH_COOKIE_NAME: 'refresh_session',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAME_SITE: 'lax',
};
