import { AuthUserResponseDtoRole } from '@/generated/models';
import type { AuthUserResponseDto } from '@/generated/models';

export type RoleRootPath = '/client' | '/trainer' | '/admin';
export type RoleHomePath =
  | '/client/dashboard'
  | '/trainer/dashboard'
  | '/admin/dashboard';

export function rootForRole(role: AuthUserResponseDto['role']): RoleRootPath {
  switch (role) {
    case AuthUserResponseDtoRole.ADMIN:
      return '/admin';
    case AuthUserResponseDtoRole.TRAINER:
      return '/trainer';
    case AuthUserResponseDtoRole.CLIENT:
    default:
      return '/client';
  }
}

export function homeForRole(role: AuthUserResponseDto['role']): RoleHomePath {
  switch (role) {
    case AuthUserResponseDtoRole.ADMIN:
      return '/admin/dashboard';
    case AuthUserResponseDtoRole.TRAINER:
      return '/trainer/dashboard';
    case AuthUserResponseDtoRole.CLIENT:
    default:
      return '/client/dashboard';
  }
}

export function isPathAllowedForRole(
  path: string,
  role: AuthUserResponseDto['role'],
): boolean {
  const root = rootForRole(role);
  return path === root || path.startsWith(`${root}/`);
}
