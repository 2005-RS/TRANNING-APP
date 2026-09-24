import type { QueryClient } from '@tanstack/react-query';

export function invalidateBodyMeasurementQueries(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['/api/v1/clients/me/body-measurements'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['/api/v1/clients/me/dashboard'],
    }),
  ]).then(() => undefined);
}

export function invalidateProgressPhotoQueries(queryClient: QueryClient): Promise<void> {
  return queryClient
    .invalidateQueries({
      queryKey: ['/api/v1/clients/me/progress-photos'],
    })
    .then(() => undefined);
}
