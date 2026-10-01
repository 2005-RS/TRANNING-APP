import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from '@/app/app-error-boundary';
import { AppRouterProvider } from '@/app/app-router';
import { Providers } from '@/app/providers';
import { getPublicEnv } from '@/shared/config/env';
import '@/i18n';
import '@/styles/index.css';

getPublicEnv();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <Providers>
        <AppRouterProvider />
      </Providers>
    </AppErrorBoundary>
  </StrictMode>,
);
