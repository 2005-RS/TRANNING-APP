export const AUTH_API = {
  login: '/api/v1/auth/login',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  logoutAll: '/api/v1/auth/logout-all',
  me: '/api/v1/auth/me',
} as const;

/**
 * 401s on these paths must never trigger single-flight refresh.
 * Login 401 is invalid credentials. Refresh 401 is a dead session.
 * Logout 401 must not mint a new refresh cookie after the user asked to leave.
 */
export function isAuthRefreshExcluded(pathname: string): boolean {
  return (
    pathname === AUTH_API.login ||
    pathname === AUTH_API.refresh ||
    pathname === AUTH_API.logout
  );
}
