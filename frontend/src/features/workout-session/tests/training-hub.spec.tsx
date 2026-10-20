import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { workoutCopy } from '@/features/workout-session/copy';
import { currentTrainingPlan } from '@/features/workout-session/tests/fixtures';
import {
  resetWorkoutMockState,
  workoutMockState,
} from '@/features/workout-session/tests/msw-workout';
import { dashboardMockState } from '@/features/client-dashboard/tests/msw-dashboard';
import type { SubscriptionResponseDto } from '@/generated/models';

function renderClient(path: string) {
  return render(
    <TestApp initialEntry={path} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Training hub', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetWorkoutMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('takes a Free client without a plan to the routines tab', async () => {
    const user = userEvent.setup();
    workoutMockState.plan = null;
    renderClient('/client/training');

    const chooseRoutine = await screen.findByRole('link', {
      name: workoutCopy.hub.chooseRoutine,
    }, { timeout: 10_000 });
    expect(chooseRoutine).toHaveAttribute('href', '/client/training?tab=library');

    await user.click(chooseRoutine);

    expect(
      await screen.findByRole('tab', { name: workoutCopy.hub.tabs.library }, { timeout: 10_000 }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('creates a self plan from selected library routines', async () => {
    const user = userEvent.setup();
    workoutMockState.plan = null;
    renderClient('/client/training?tab=library');

    expect(
      await screen.findByRole('heading', { name: 'Full body foundation' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    const selectButtons = screen.getAllByRole('button', { name: workoutCopy.hub.selectRoutine });
    await user.click(selectButtons[0]!);
    await user.click(selectButtons[1]!);
    await user.click(screen.getByRole('button', { name: workoutCopy.hub.createRoutine }));

    expect(workoutMockState.lastCreateSelfPlan).toEqual({
      workouts: workoutMockState.library.map((routine) => ({ workoutTemplateId: routine.id })),
    });
  });

  it('shows the trainer-plan conflict copy when the trainer owns the active plan', async () => {
    renderClient('/client/training?tab=library');

    expect(
      await screen.findByText(workoutCopy.hub.trainerManagesPlan, undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('labels self-authored and trainer-authored plans', async () => {
    renderClient('/client/training');

    expect(await screen.findByText(workoutCopy.hub.coachPlan, undefined, { timeout: 10_000 })).toBeInTheDocument();

    workoutMockState.plan = { ...currentTrainingPlan, isSelfAuthored: true };
    renderClient('/client/training');

    expect(await screen.findByText(workoutCopy.hub.myRoutine, undefined, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('shows the self-plan Pro prompt to Free clients only', async () => {
    workoutMockState.plan = { ...currentTrainingPlan, isSelfAuthored: true };
    renderClient('/client/training');

    await screen.findByText(workoutCopy.hub.myRoutine, undefined, { timeout: 10_000 });
    expect(
      await screen.findByRole('link', { name: workoutCopy.hub.proPrompt }, { timeout: 10_000 }),
    ).toHaveAttribute('href', '/client/plan');
  });

  it('hides the self-plan Pro prompt from Pro clients', async () => {
    workoutMockState.plan = { ...currentTrainingPlan, isSelfAuthored: true };
    dashboardMockState.subscription = {
      ...dashboardMockState.subscription,
      plan: 'PRO',
      source: 'PAID',
      proUntil: '2026-11-01T00:00:00.000Z',
    } satisfies SubscriptionResponseDto;
    renderClient('/client/training');

    await screen.findByText(workoutCopy.hub.myRoutine, undefined, { timeout: 10_000 });
    expect(screen.queryByRole('link', { name: workoutCopy.hub.proPrompt })).not.toBeInTheDocument();
  });

  it('lists completed workout history', async () => {
    renderClient('/client/training?tab=history');

    expect(await screen.findByText('Lower A', undefined, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('keeps the selected tab in the URL', async () => {
    renderClient('/client/training?tab=history');

    const libraryTab = await screen.findByRole(
      'tab',
      { name: workoutCopy.hub.tabs.library },
      { timeout: 10_000 },
    );
    expect(libraryTab).toHaveAttribute('href', '/client/training?tab=library');
  });
});
