import { useClientDashboardGetMine } from '@/generated/client-dashboard/client-dashboard';
import {
  CLIENT_DASHBOARD_PERIOD_DAYS,
  CLIENT_DASHBOARD_STALE_TIME_MS,
} from '@/features/client-dashboard/lib/query-policy';

export function useClientDashboard() {
  return useClientDashboardGetMine(
    { periodDays: CLIENT_DASHBOARD_PERIOD_DAYS },
    {
      query: {
        staleTime: CLIENT_DASHBOARD_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  );
}
