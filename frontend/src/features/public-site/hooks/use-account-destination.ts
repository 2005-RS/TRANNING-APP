import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { homeForRole } from '@/features/auth/lib/role-home';
import { usePublicSiteCopy } from '@/features/public-site/copy';

/** Signed-in visitors are pointed at their own workspace instead of the login form. */
export function useAccountDestination() {
  const copy = usePublicSiteCopy();
  const { status, user } = useAuthSession();
  if (status === 'AUTHENTICATED' && user) {
    return { signedIn: true, to: homeForRole(user.role), label: copy.nav.goToApp } as const;
  }
  return { signedIn: false, to: '/login', label: copy.nav.signIn } as const;
}
