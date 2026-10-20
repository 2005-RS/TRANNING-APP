import { delay, http, HttpResponse } from 'msw';
import { emptyClientDashboard } from '@/features/client-dashboard/tests/fixtures';
import type { ClientDashboardResponseDto } from '@/generated/models';
import type {
  CurrentTrainerResponseDto,
  SubscriptionResponseDto,
} from '@/generated/models';
import { currentTrainingPlan } from '@/features/workout-session/tests/fixtures';

const DASHBOARD_URL = 'http://localhost:3000/api/v1/clients/me/dashboard';
const SUBSCRIPTION_URL = 'http://localhost:3000/api/v1/clients/me/subscription';
const CURRENT_PLAN_URL = 'http://localhost:3000/api/v1/clients/me/training-plans/current';
const TRAINER_URL = 'http://localhost:3000/api/v1/clients/me/trainer';

const freeSubscription: SubscriptionResponseDto = {
  plan: 'FREE', periodDays: 30,
  sinpe: { phone: '88888888', holderName: 'Training App', priceCrc: 10000 },
  pendingPayment: null, lastRejectedPayment: null,
};

type DashboardMockState = {
  body: ClientDashboardResponseDto;
  status: number;
  delayMs: number;
  failNetwork: boolean;
  subscriptionStatus: number;
  subscription: SubscriptionResponseDto;
  trainerStatus: number;
  trainer: CurrentTrainerResponseDto;
  /** When true, the current-plan endpoint mirrors `body.trainingPlan` (dashboard specs only). */
  mirrorCurrentPlan: boolean;
};

export const dashboardMockState: DashboardMockState = {
  body: emptyClientDashboard,
  status: 200,
  delayMs: 0,
  failNetwork: false,
  subscriptionStatus: 200,
  subscription: freeSubscription,
  trainerStatus: 200,
  trainer: { trainer: null },
  mirrorCurrentPlan: false,
};

export function resetDashboardMockState(): void {
  dashboardMockState.body = emptyClientDashboard;
  dashboardMockState.status = 200;
  dashboardMockState.delayMs = 0;
  dashboardMockState.failNetwork = false;
  dashboardMockState.subscriptionStatus = 200;
  dashboardMockState.subscription = freeSubscription;
  dashboardMockState.trainerStatus = 200;
  dashboardMockState.trainer = { trainer: null };
  dashboardMockState.mirrorCurrentPlan = false;
}

export const dashboardHandlers = [
  // The Today card reads the full current plan; mirror the dashboard plan summary.
  http.get(CURRENT_PLAN_URL, () => {
    if (!dashboardMockState.mirrorCurrentPlan) {
      // Fall through to the workout-session handler.
      return undefined;
    }
    const summary = dashboardMockState.body.trainingPlan;
    return HttpResponse.json({
      trainingPlan: summary
        ? { ...currentTrainingPlan, id: summary.id, name: summary.name }
        : null,
    });
  }),
  http.get(SUBSCRIPTION_URL, () => {
    if (dashboardMockState.subscriptionStatus >= 400) {
      return HttpResponse.json(
        { message: 'Subscription unavailable' },
        { status: dashboardMockState.subscriptionStatus },
      );
    }
    return HttpResponse.json(dashboardMockState.subscription);
  }),
  http.get(TRAINER_URL, () => {
    if (dashboardMockState.trainerStatus >= 400) {
      return HttpResponse.json(
        { message: 'Trainer unavailable' },
        { status: dashboardMockState.trainerStatus },
      );
    }
    return HttpResponse.json(dashboardMockState.trainer);
  }),
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
