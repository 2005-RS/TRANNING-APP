import { useContext } from 'react';
import {
  AuthSessionContext,
  type AuthSessionValue,
} from '@/features/auth/lib/auth-session-context';

export function useAuthSession(): AuthSessionValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return value;
}
