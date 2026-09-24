export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const ARGON2_MEMORY_COST_KIB = 19_456;
export const ARGON2_TIME_COST = 2;
export const ARGON2_PARALLELISM = 1;

export const AUTH_LOGIN_THROTTLE_TTL_MS = 60_000;
export const AUTH_LOGIN_THROTTLE_LIMIT = 8;
export const AUTH_REFRESH_THROTTLE_TTL_MS = 60_000;
export const AUTH_REFRESH_THROTTLE_LIMIT = 12;

export const AUTH_COOKIE_PATH = '/api/v1/auth';
export const REFRESH_SECRET_BYTES = 32;
export const GENERIC_AUTH_FAILURE_MESSAGE = 'Invalid credentials';
