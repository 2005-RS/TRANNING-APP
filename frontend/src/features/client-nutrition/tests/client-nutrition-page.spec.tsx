import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientCopy } from '@/features/navigation/copy';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  dashboardMockState,
  resetDashboardMockState,
} from '@/features/client-dashboard/tests/msw-dashboard';
import { populatedClientDashboard } from '@/features/client-dashboard/tests/fixtures';
import {
  nutritionMockState,
  resetNutritionMockState,
} from '@/features/client-nutrition/tests/msw-nutrition';
import {
  partialTargetsPlan,
  populatedCurrentPlan,
  zeroTargetsPlan,
} from '@/features/client-nutrition/tests/fixtures';

const timeout = 4000;

function renderNutrition(entry = '/client/nutrition') {
  return render(
    <TestApp initialEntry={entry} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Client nutrition', { timeout: 15_000 }, () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetNutritionMockState();
    resetDashboardMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows a skeleton instead of Loading...', async () => {
    nutritionMockState.delayMs = 1500;
    nutritionMockState.current = populatedCurrentPlan;
    renderNutrition();

    await screen.findByRole('navigation', { name: clientCopy.mainNav }, { timeout: 10_000 });
    expect(
      await screen.findByRole('status', { name: clientNutritionCopy.loadingLabel }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders prescribed targets, meals, decimals, and active nav', async () => {
    nutritionMockState.current = populatedCurrentPlan;
    renderNutrition();

    expect(
      await screen.findByRole('heading', { name: 'Performance meals' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.plan.statusActive)).toBeInTheDocument();
    expect(screen.getAllByText('2,450 kcal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('180 g').length).toBeGreaterThan(0);
    expect(screen.getByText('62.5 g')).toBeInTheDocument();
    expect(screen.getByText('150.5 g')).toBeInTheDocument();
    expect(screen.getByText('Greek yogurt')).toBeInTheDocument();
    expect(screen.getByText('Oats')).toBeInTheDocument();
    expect(screen.getByText('Morning plate')).toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.meals.noFoods)).toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.totals.dailyTarget)).toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.totals.mealTotal)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /remaining calories/i })).not.toBeInTheDocument();
    expect(screen.queryByText(PLAN_LEAK)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows an honest empty state without fake metrics', async () => {
    renderNutrition();

    expect(
      await screen.findByRole('heading', { name: clientNutritionCopy.emptyTitle }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.emptyBody)).toBeInTheDocument();
    expect(screen.queryByText('0 kcal')).not.toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });

  it('omits missing optional targets without breaking', async () => {
    nutritionMockState.current = { nutritionPlan: partialTargetsPlan };
    renderNutrition();

    expect(
      await screen.findByRole('heading', { name: 'Protein-only targets' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('160 g')).toBeInTheDocument();
    expect(screen.queryByText(clientNutritionCopy.targets.calories)).not.toBeInTheDocument();
    expect(screen.getByText(clientNutritionCopy.meals.noFoods)).toBeInTheDocument();
  });

  it('treats zero targets as real zeros', async () => {
    nutritionMockState.current = { nutritionPlan: zeroTargetsPlan };
    renderNutrition();

    expect(
      await screen.findByRole('heading', { name: 'Zeroed targets' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('0 kcal').length).toBeGreaterThan(0);
    expect(screen.getByText(clientNutritionCopy.meals.empty)).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });

  it('retries a recoverable error without leaving the Client shell', async () => {
    const user = userEvent.setup();
    nutritionMockState.status = 500;
    renderNutrition();

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
    expect(screen.queryByText('Nutrition plan failed')).not.toBeInTheDocument();

    nutritionMockState.status = 200;
    nutritionMockState.current = populatedCurrentPlan;
    await user.click(screen.getByRole('button', { name: clientNutritionCopy.error.retry }));

    expect(
      await screen.findByRole('heading', { name: 'Performance meals' }, { timeout }),
    ).toBeInTheDocument();
  });

  it('opens Nutrition from the dashboard CTA', async () => {
    const user = userEvent.setup();
    dashboardMockState.body = populatedClientDashboard;
    nutritionMockState.current = populatedCurrentPlan;
    renderNutrition('/client/dashboard');

    expect(
      await screen.findByRole('link', { name: clientDashboardCopy.nutrition.viewNutrition }, { timeout }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: clientDashboardCopy.nutrition.viewNutrition }));

    expect(
      await screen.findByRole('heading', { name: 'Performance meals' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

const PLAN_LEAK = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
