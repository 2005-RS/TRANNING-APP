import { QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
} from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { AuthSessionProvider } from '@/app/providers/auth-session-provider';
import { createAppRouter } from '@/app/router';
import type { AuthStatus } from '@/features/auth/lib/auth-session-context';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import type { AuthUserResponseDto } from '@/generated/models';
import { LanguageProvider } from '@/i18n/language-provider';
import { createAppQueryClient } from '@/shared/lib/query-client';
import { ThemeProvider } from '@/shared/lib/theme-provider';

function RouterWithAuth({
  router,
}: {
  router: ReturnType<typeof createAppRouter>;
}) {
  const auth = useAuthSession();
  return <RouterProvider router={router} context={{ auth }} />;
}

export function TestProviders({
  children,
  status = 'UNAUTHENTICATED',
  user = null,
}: {
  children: ReactNode;
  status?: AuthStatus;
  user?: AuthUserResponseDto | null;
}) {
  const queryClient = createAppQueryClient();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider
          skipBootstrap
          initialStatus={status}
          initialUser={user}
        >
          <LanguageProvider>{children}</LanguageProvider>
        </AuthSessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function createTestRouter(initialEntry = '/login') {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  return createAppRouter(history);
}

export function TestApp({
  initialEntry = '/login',
  status = 'UNAUTHENTICATED',
  user = null,
  skipBootstrap = true,
}: {
  initialEntry?: string;
  status?: AuthStatus;
  user?: AuthUserResponseDto | null;
  skipBootstrap?: boolean;
}) {
  const queryClient = createAppQueryClient();
  const [router] = useState(() => createTestRouter(initialEntry));
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider
          skipBootstrap={skipBootstrap}
          initialStatus={status}
          initialUser={user}
        >
          <LanguageProvider>
            <RouterWithAuth router={router} />
          </LanguageProvider>
        </AuthSessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
