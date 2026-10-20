import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { authCopy } from '@/features/auth/copy';
import { clientProfileCopy } from '@/features/client-profile/copy';
import { profileMockState } from '@/features/client-profile/tests/msw-profile';
import { workoutMockState } from '@/features/workout-session/tests/msw-workout';
import { currentTrainingPlan } from '@/features/workout-session/tests/fixtures';
import { workoutCopy } from '@/features/workout-session/copy';
import { nutritionMockState } from '@/features/client-nutrition/tests/msw-nutrition';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import type { NutritionPlanResponseDto } from '@/generated/models';

const timeout = 10_000;
const copy = clientProfileCopy;

function renderAt(path: string) {
  return render(<TestApp initialEntry={path} status="AUTHENTICATED" user={clientA} />);
}

describe('Client profile and plan history (F1)', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows read-only identity and the current preferences', async () => {
    renderAt('/client/profile');

    expect(await screen.findByRole('heading', { level: 1, name: copy.title }, { timeout })).toBeInTheDocument();
    expect(screen.getByText('Ada Client')).toBeInTheDocument();
    expect(screen.getByText('client.a@example.test')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('88887777', undefined, { timeout })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.primaryGoal)).toHaveValue('GENERAL_FITNESS');
    expect(screen.getByRole('link', { name: copy.changePassword })).toHaveAttribute('href', '/forgot-password');
  });

  it('saves only the changed fields', { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    renderAt('/client/profile');

    await screen.findByDisplayValue('88887777', undefined, { timeout });
    await user.selectOptions(screen.getByLabelText(copy.primaryGoal), 'STRENGTH');
    await user.click(screen.getByRole('button', { name: copy.save }));

    // The success toast lives in the app providers; assert the request instead.
    await waitFor(() => expect(profileMockState.lastUpdate).toEqual({ primaryGoal: 'STRENGTH' }), { timeout });
    expect(authCopy.register.goals.STRENGTH).toBeTruthy();
  });

  it('rejects letters in the phone and does not call the API', { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    renderAt('/client/profile');

    const phone = await screen.findByDisplayValue('88887777', undefined, { timeout });
    await user.clear(phone);
    await user.type(phone, 'abc');
    await user.click(screen.getByRole('button', { name: copy.save }));

    expect(await screen.findByText(copy.phoneInvalid, undefined, { timeout })).toBeInTheDocument();
    expect(profileMockState.lastUpdate).toBeNull();
  });

  it('shows safe copy when saving fails', { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    profileMockState.updateStatus = 500;
    renderAt('/client/profile');

    const phone = await screen.findByDisplayValue('88887777', undefined, { timeout });
    await user.clear(phone);
    await user.type(phone, '88886666');
    await user.click(screen.getByRole('button', { name: copy.save }));

    expect(await screen.findByRole('alert', undefined, { timeout })).toHaveTextContent(copy.saveError);
    expect(screen.queryByText(/must not leak/)).not.toBeInTheDocument();
  });

  it('lists previous training plans and opens one read-only', { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    workoutMockState.archivedPlans = [
      { ...currentTrainingPlan, id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Old block', status: 'ARCHIVED' },
    ];
    renderAt('/client/training?tab=history');

    const section = await screen.findByRole('heading', { name: workoutCopy.hub.previousPlans }, { timeout });
    const list = section.closest('section') as HTMLElement;
    await user.click(within(list).getByRole('link', { name: /Old block/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Old block' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: workoutCopy.hub.workouts })).toBeInTheDocument();
  });

  it('shows an empty state without previous training plans', async () => {
    renderAt('/client/training?tab=history');

    expect(await screen.findByText(workoutCopy.hub.previousPlansEmpty, undefined, { timeout })).toBeInTheDocument();
  });

  it('lists previous nutrition plans on the nutrition plan page', async () => {
    nutritionMockState.archivedPlans = [
      {
        id: 'bbbbbbbb-0000-4000-8000-000000000001',
        name: 'Cut phase',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      } as unknown as NutritionPlanResponseDto,
    ];
    renderAt('/client/nutrition/plan');

    expect(await screen.findByRole('link', { name: /Cut phase/ }, { timeout })).toHaveAttribute(
      'href',
      '/client/nutrition/plans/bbbbbbbb-0000-4000-8000-000000000001',
    );
    expect(clientNutritionCopy.previousPlans).toBeTruthy();
  });
});
