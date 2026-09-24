import {
  authLogin,
  authLogout,
  authLogoutAll,
  authMe,
} from '@/generated/auth/auth';
import type { AuthUserResponseDto } from '@/generated/models';
import { ApiError } from '@/shared/errors/api-error';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/shared/lib/access-token';
import { refreshSession } from '@/shared/lib/api-mutator';

export type BootstrapResult =
  | { status: 'authenticated'; user: AuthUserResponseDto }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

let bootstrapInFlight: Promise<BootstrapResult> | null = null;

export function resetAuthBootstrap(): void {
  bootstrapInFlight = null;
}

export async function bootstrapAuthSession(): Promise<BootstrapResult> {
  if (!bootstrapInFlight) {
    bootstrapInFlight = (async (): Promise<BootstrapResult> => {
      if (!getAccessToken()) {
        const refresh = await refreshSession();
        if (refresh.status === 'unauthenticated') {
          return { status: 'unauthenticated' };
        }
        if (refresh.status === 'unavailable') {
          return { status: 'unavailable' };
        }
      }

      try {
        const user = await authMe();
        return { status: 'authenticated', user };
      } catch (error) {
        clearAccessToken();
        if (error instanceof ApiError && error.statusCode === 401) {
          return { status: 'unauthenticated' };
        }
        return { status: 'unavailable' };
      }
    })();
  }

  return bootstrapInFlight;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthUserResponseDto> {
  const result = await authLogin({ email, password });
  setAccessToken(result.accessToken);

  try {
    const user = await authMe();
    resetAuthBootstrap();
    return user;
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await authLogout();
  } catch {
    // Local cleanup is mandatory even when the API or network fails.
  } finally {
    clearAccessToken();
    resetAuthBootstrap();
  }
}

export async function logoutAllSessions(): Promise<void> {
  try {
    await authLogoutAll();
  } catch {
    // Same local guarantee as single-session logout.
  } finally {
    clearAccessToken();
    resetAuthBootstrap();
  }
}
