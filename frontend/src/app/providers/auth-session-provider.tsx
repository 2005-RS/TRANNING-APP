import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAuthMeQueryKey } from '@/generated/auth/auth';
import type { AuthUserResponseDto } from '@/generated/models';
import {
  AuthSessionContext,
  type AuthStatus,
} from '@/features/auth/lib/auth-session-context';
import {
  bootstrapAuthSession,
  loginWithPassword,
  logoutAllSessions,
  logoutCurrentSession,
  resetAuthBootstrap,
  type BootstrapResult,
} from '@/features/auth/lib/session-service';
import { setOnAuthFailure } from '@/shared/lib/api-mutator';

type AuthSessionProviderProps = {
  children: ReactNode;
  initialStatus?: AuthStatus;
  initialUser?: AuthUserResponseDto | null;
  skipBootstrap?: boolean;
};

export function AuthSessionProvider({
  children,
  initialStatus = 'BOOTSTRAPPING',
  initialUser = null,
  skipBootstrap = false,
}: AuthSessionProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(initialStatus);
  const [user, setUser] = useState<AuthUserResponseDto | null>(initialUser);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearClientCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const becomeUnauthenticated = useCallback(() => {
    setUser(null);
    setStatus('UNAUTHENTICATED');
    clearClientCache();
  }, [clearClientCache]);

  const becomeAuthenticated = useCallback(
    (nextUser: AuthUserResponseDto) => {
      clearClientCache();
      queryClient.setQueryData(getAuthMeQueryKey(), nextUser);
      setUser(nextUser);
      setStatus('AUTHENTICATED');
    },
    [clearClientCache, queryClient],
  );

  const becomeRestoreFailed = useCallback(() => {
    setUser(null);
    setStatus('RESTORE_FAILED');
  }, []);

  const applyBootstrapResult = useCallback(
    (result: BootstrapResult) => {
      if (!mountedRef.current) {
        return;
      }
      if (result.status === 'authenticated') {
        becomeAuthenticated(result.user);
        return;
      }
      if (result.status === 'unauthenticated') {
        becomeUnauthenticated();
        return;
      }
      becomeRestoreFailed();
    },
    [becomeAuthenticated, becomeRestoreFailed, becomeUnauthenticated],
  );

  useEffect(() => {
    setOnAuthFailure(() => {
      becomeUnauthenticated();
    });

    return () => {
      setOnAuthFailure(null);
    };
  }, [becomeUnauthenticated]);

  useEffect(() => {
    if (skipBootstrap) {
      return;
    }

    let cancelled = false;

    void bootstrapAuthSession().then((result) => {
      if (cancelled) {
        return;
      }
      applyBootstrapResult(result);
    });

    return () => {
      cancelled = true;
    };
  }, [applyBootstrapResult, skipBootstrap]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const nextUser = await loginWithPassword(input.email, input.password);
      becomeAuthenticated(nextUser);
    },
    [becomeAuthenticated],
  );

  const logout = useCallback(async () => {
    await logoutCurrentSession();
    becomeUnauthenticated();
  }, [becomeUnauthenticated]);

  const logoutAll = useCallback(async () => {
    await logoutAllSessions();
    becomeUnauthenticated();
  }, [becomeUnauthenticated]);

  const retryRestore = useCallback(async () => {
    resetAuthBootstrap();
    setUser(null);
    setStatus('BOOTSTRAPPING');
    const result = await bootstrapAuthSession();
    applyBootstrapResult(result);
  }, [applyBootstrapResult]);

  const continueToSignIn = useCallback(() => {
    becomeUnauthenticated();
  }, [becomeUnauthenticated]);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
      logoutAll,
      retryRestore,
      continueToSignIn,
    }),
    [continueToSignIn, login, logout, logoutAll, retryRestore, status, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
