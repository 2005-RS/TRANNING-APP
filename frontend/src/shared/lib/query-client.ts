import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/errors/api-error';

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 429
    ) {
      return false;
    }
  }

  return failureCount < 1;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
