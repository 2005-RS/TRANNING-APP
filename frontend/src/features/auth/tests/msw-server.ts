import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { clientA } from '@/features/auth/tests/fixtures';
import {
  dashboardHandlers,
  resetDashboardMockState,
} from '@/features/client-dashboard/tests/msw-dashboard';
import {
  progressHandlers,
  resetProgressMockState,
} from '@/features/client-progress/tests/msw-progress';
import {
  nutritionHandlers,
  resetNutritionMockState,
} from '@/features/client-nutrition/tests/msw-nutrition';
import {
  bodyHandlers,
  resetBodyMockState,
} from '@/features/client-body/tests/msw-body';
import {
  checkInHandlers,
  resetCheckInMockState,
} from '@/features/client-check-ins/tests/msw-check-ins';
import {
  resetWorkoutMockState,
  workoutHandlers,
} from '@/features/workout-session/tests/msw-workout';
import {
  resetTrainerMockState,
  trainerHandlers,
} from '@/features/trainer-workspace/tests/msw-trainer';
import { adminHandlers, resetAdminMockState } from '@/features/admin-workspace/tests/msw-admin';

const API = 'http://localhost:3000/api/v1/auth';

type AuthMockState = {
  refreshOk: boolean;
  meOk: boolean;
  loginOk: boolean;
  currentUser: typeof clientA;
};

export const authMockState: AuthMockState = {
  refreshOk: false,
  meOk: true,
  loginOk: true,
  currentUser: clientA,
};

export function resetAuthMockState(): void {
  authMockState.refreshOk = false;
  authMockState.meOk = true;
  authMockState.loginOk = true;
  authMockState.currentUser = clientA;
  resetDashboardMockState();
  resetWorkoutMockState();
  resetProgressMockState();
  resetNutritionMockState();
  resetBodyMockState();
  resetCheckInMockState();
  resetTrainerMockState();
  resetAdminMockState();
}

export const authHandlers = [
  http.post(`${API}/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!authMockState.loginOk || body.password === 'wrong') {
      return HttpResponse.json(
        {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          path: '/api/v1/auth/login',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'req-login',
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: 'login-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: authMockState.currentUser,
    });
  }),
  http.post(`${API}/refresh`, () => {
    if (!authMockState.refreshOk) {
      return HttpResponse.json(
        {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Refresh failed',
          path: '/api/v1/auth/refresh',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'req-refresh',
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: 'refresh-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: authMockState.currentUser,
    });
  }),
  http.get(`${API}/me`, () => {
    if (!authMockState.meOk) {
      return HttpResponse.json(
        {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
          path: '/api/v1/auth/me',
          timestamp: '2026-09-04T00:00:00.000Z',
          requestId: 'req-me',
        },
        { status: 401 },
      );
    }

    return HttpResponse.json(authMockState.currentUser);
  }),
  http.post(`${API}/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/logout-all`, () => new HttpResponse(null, { status: 204 })),
];

export const authServer = setupServer(
  ...authHandlers,
  ...dashboardHandlers,
  ...workoutHandlers,
  ...progressHandlers,
  ...nutritionHandlers,
  ...bodyHandlers,
  ...checkInHandlers,
  ...trainerHandlers,
  ...adminHandlers,
);
