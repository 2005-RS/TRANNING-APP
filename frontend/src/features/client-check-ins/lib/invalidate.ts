import type { QueryClient } from '@tanstack/react-query';
import { getClientCheckInsGetOneQueryKey } from '@/generated/client-check-ins/client-check-ins';

export function invalidateClientCheckInQueries(
  queryClient: QueryClient,
  checkInId?: string,
): Promise<void> {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: ['/api/v1/clients/me/check-ins'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['/api/v1/clients/me/dashboard'],
    }),
  ];
  if (checkInId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: getClientCheckInsGetOneQueryKey(checkInId),
      }),
    );
  }
  return Promise.all(tasks).then(() => undefined);
}
