import type { QueryClient } from '@tanstack/react-query';
import { getAdminDashboardGetSystemQueryKey } from '@/generated/admin-dashboard/admin-dashboard';
import {
  getClientTrainerAssignmentsGetClientTrainerQueryKey,
  getClientTrainerAssignmentsListHistoryQueryKey,
} from '@/generated/clients/clients';

/** Assignment writes affect the client's current trainer, its history, and system coverage counts. */
export async function invalidateClientAssignment(queryClient: QueryClient, clientId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getClientTrainerAssignmentsGetClientTrainerQueryKey(clientId) }),
    queryClient.invalidateQueries({ queryKey: getClientTrainerAssignmentsListHistoryQueryKey(clientId) }),
    queryClient.invalidateQueries({ queryKey: getAdminDashboardGetSystemQueryKey() }),
  ]);
}
