import type { AuthSessionValue } from '@/features/auth/lib/auth-session-context';

export type AppRouterContext = {
  auth: AuthSessionValue;
};

export const idleAuthContext: AuthSessionValue = {
  status: 'BOOTSTRAPPING',
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
  logoutAll: async () => undefined,
  retryRestore: async () => undefined,
  continueToSignIn: () => undefined,
};
