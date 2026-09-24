import {
  homeForRole,
  isPathAllowedForRole,
  rootForRole,
} from '@/features/auth/lib/role-home';
import type { AuthUserResponseDto } from '@/generated/models';

const INTERNAL_PREFIXES = ['/client', '/trainer', '/admin'] as const;

export function sanitizeInternalPath(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const path = value.trim();
  if (!path.startsWith('/')) {
    return undefined;
  }
  if (path.startsWith('//') || path.includes('://')) {
    return undefined;
  }
  if (path === '/login' || path.startsWith('/login?') || path.startsWith('/login/')) {
    return undefined;
  }

  if (path === '/') {
    return undefined;
  }

  const isSafePrefix = INTERNAL_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return isSafePrefix ? path : undefined;
}

export function resolveAuthenticatedDestination(
  role: AuthUserResponseDto['role'],
  redirect?: string,
): string {
  const home = homeForRole(role);
  const safe = sanitizeInternalPath(redirect);
  if (!safe || !isPathAllowedForRole(safe, role)) {
    return home;
  }
  if (safe === rootForRole(role)) {
    return home;
  }
  return safe;
}
