import { delay, http, HttpResponse } from 'msw';
import { emptyClientDashboard } from '@/features/client-dashboard/tests/fixtures';
import type { ClientDashboardResponseDto } from '@/generated/models';

const DASHBOARD_URL = 'http://localhost:3000/api/v1/clients/me/dashboard';

type DashboardMockState = {
  body: ClientDashboardResponseDto;
  status: number;
  delayMs: number;
  failNetwork: boolean;
};

export const dashboardMockState: DashboardMockState = {
  body: emptyClientDashboard,
  status: 200,
  delayMs: 0,
  failNetwork: false,
};

export function resetDashboardMockState(): void {
  dashboardMockState.body = emptyClientDashboard;
  dashboardMockState.status = 200;
  dashboardMockState.delayMs = 0;
  dashboardMockState.failNetwork = false;
}

export const dashboardHandlers = [
  http.get(DASHBOARD_URL, async () => {
    if (dashboardMockState.delayMs > 0) {
      await delay(dashboardMockState.delayMs);
    }
    if (dashboardMockState.failNetwork) {
      return HttpResponse.error();
    }
    if (dashboardMockState.status >= 400) {
      return HttpResponse.json(
        {
          statusCode: dashboardMockState.status,
          code: dashboardMockState.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
          message:
            dashboardMockState.status === 403
              ? 'Forbidden internals must not leak'
              : 'Dashboard failed',
          path: '/api/v1/clients/me/dashboard',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'req-dashboard',
        },
        { status: dashboardMockState.status },
      );
    }
    return HttpResponse.json(dashboardMockState.body);
  }),
];
