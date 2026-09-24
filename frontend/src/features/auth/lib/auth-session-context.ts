import { createContext } from 'react';
import type { AuthUserResponseDto } from '@/generated/models';

export type AuthStatus =
  | 'BOOTSTRAPPING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'RESTORE_FAILED';

export function isAuthUnresolved(status: AuthStatus): boolean {
  return status === 'BOOTSTRAPPING' || status === 'RESTORE_FAILED';
}

export type AuthSessionValue = {
  status: AuthStatus;
  user: AuthUserResponseDto | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  retryRestore: () => Promise<void>;
  continueToSignIn: () => void;
};

export const AuthSessionContext = createContext<AuthSessionValue | null>(null);
