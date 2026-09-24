import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { AuthSessionProvider } from '@/app/providers/auth-session-provider';
import { LanguageProvider } from '@/i18n/language-provider';
import { createAppQueryClient } from '@/shared/lib/query-client';
import { ThemeProvider } from '@/shared/lib/theme-provider';
import { useTheme } from '@/shared/lib/use-theme';

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      richColors={false}
      closeButton
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
          <ThemedToaster />
        </AuthSessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
