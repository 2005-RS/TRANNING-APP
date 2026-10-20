import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import {
  authServer,
  resetAuthMockState,
} from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientCopy } from '@/features/navigation/copy';
import { workoutCopy } from '@/features/workout-session/copy';
import {
  createInProgressSession,
  FOREIGN_SESSION_ID,
  SESSION_ID,
  SQUAT_SESSION_EXERCISE_ID,
  STARTED_SESSION_ID,
} from '@/features/workout-session/tests/fixtures';
import {
  resetWorkoutMockState,
  workoutMockState,
} from '@/features/workout-session/tests/msw-workout';
import { dashboardMockState } from '@/features/client-dashboard/tests/msw-dashboard';
import type { SubscriptionResponseDto } from '@/generated/models';

const timeout = 8000;

function renderClient(path: string) {
  return render(
    <TestApp initialEntry={path} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Workout experience', { timeout: 15_000 }, () => {
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

  it(
    'lists current plan workouts and starts a session',
    { timeout: 15_000 },
    async () => {
    const user = userEvent.setup();
    renderClient('/client/training');

    expect(
      await screen.findByRole('heading', { name: workoutCopy.hub.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hypertrophy block 4' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lower A' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: workoutCopy.hub.startNamed('Lower A') }));

    expect(
      await screen.findByRole('link', { name: clientCopy.workout.close }, { timeout }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Back squat', undefined, { timeout })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: clientCopy.mainNav })).not.toBeInTheDocument();
    expect(workoutMockState.currentSession?.id).toBe(STARTED_SESSION_ID);
  });

  it('resumes an in-progress session from the training hub', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient('/client/training');

    expect(
      await screen.findByRole('link', { name: workoutCopy.hub.continue }, { timeout }),
    ).toHaveAttribute('href', `/client/workout/${SESSION_ID}`);

    await user.click(screen.getByRole('link', { name: workoutCopy.hub.continue }));
    expect(
      await screen.findByRole('heading', { name: 'Lower A' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: clientCopy.workout.close })).toBeInTheDocument();
  });

  it('maps a start conflict without leaking internals', async () => {
    const user = userEvent.setup();
    workoutMockState.startStatus = 409;
    renderClient('/client/training');

    await screen.findByRole('heading', { name: workoutCopy.hub.title }, { timeout });
    await user.click(screen.getByRole('button', { name: workoutCopy.hub.startNamed('Lower A') }));

    expect(
      await screen.findByText('Cannot complete this action', undefined, { timeout }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('An in-progress workout session already exists.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stack/i)).not.toBeInTheDocument();
  });

  it('opens the first incomplete exercise and shows its previous set', async () => {
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Lower A' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back squat/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /Plank/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('75 × 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1, kilograms')).toHaveValue('75');
    expect(screen.getByLabelText('Set 1, repetitions')).toHaveValue('10');
  });

  it('logs a set against the generated replace-sets contract and shows rest controls', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Lower A' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: clientCopy.mainNav })).not.toBeInTheDocument();
    expect(screen.queryByText(SESSION_ID)).not.toBeInTheDocument();
    expect(screen.queryByText(SQUAT_SESSION_EXERCISE_ID)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record set 1' }));

    expect(
      await screen.findByRole('timer', undefined, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: workoutCopy.focus.restSubtract15 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: workoutCopy.focus.restAdd15 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: workoutCopy.focus.skipRest })).toBeInTheDocument();
    expect(workoutMockState.lastReplaceSets).toEqual({
      sessionId: SESSION_ID,
      sessionExerciseId: SQUAT_SESSION_EXERCISE_ID,
      sets: [{ actualReps: 10, actualLoadKg: 75 }],
    });
  });

  it('requires a recorded set before complete and then finishes the session', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    expect(screen.getByRole('button', { name: workoutCopy.focus.complete })).toBeDisabled();
    expect(screen.getByText(workoutCopy.focus.completeNeedSets)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record set 1' }));
    await screen.findByRole('timer', undefined, { timeout });
    await user.click(screen.getByRole('button', { name: workoutCopy.focus.skipRest }));

    const finish = screen.getByRole('button', { name: workoutCopy.focus.complete });
    expect(finish).toBeEnabled();
    await user.click(finish);
    const dialog = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(
      within(dialog).getByRole('button', { name: workoutCopy.focus.completeConfirm }),
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: workoutCopy.focus.completedTitle },
        { timeout },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: workoutCopy.focus.proSummary })).toHaveAttribute(
      'href',
      '/client/plan',
    );
    expect(workoutMockState.sessions[SESSION_ID]?.status).toBe('COMPLETED');
  });

  it('hides the summary Pro prompt from Pro clients', async () => {
    const user = userEvent.setup();
    dashboardMockState.subscription = {
      ...dashboardMockState.subscription,
      plan: 'PRO',
      source: 'PAID',
      proUntil: '2026-11-01T00:00:00.000Z',
    } satisfies SubscriptionResponseDto;
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    await user.click(screen.getByRole('button', { name: 'Record set 1' }));
    await screen.findByRole('timer', undefined, { timeout });
    await user.click(screen.getByRole('button', { name: workoutCopy.focus.skipRest }));
    await user.click(screen.getByRole('button', { name: workoutCopy.focus.complete }));
    const dialog = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(
      within(dialog).getByRole('button', { name: workoutCopy.focus.completeConfirm }),
    );

    await screen.findByRole(
      'heading',
      { name: workoutCopy.focus.completedTitle },
      { timeout },
    );
    expect(screen.queryByRole('link', { name: workoutCopy.focus.proSummary })).not.toBeInTheDocument();
  });

  it('only removes the last recorded set after confirmation', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    await user.click(screen.getByRole('button', { name: 'Record set 1' }));
    await screen.findByRole('button', { name: 'Remove set 1' }, { timeout });
    await user.click(screen.getByRole('button', { name: 'Remove set 1' }));

    const dialog = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(
      within(dialog).getByRole('button', {
        name: workoutCopy.focus.undoConfirm,
      }),
    );

    expect(workoutMockState.lastReplaceSets).toEqual({
      sessionId: SESSION_ID,
      sessionExerciseId: SQUAT_SESSION_EXERCISE_ID,
      sets: [],
    });
  });

  it('shows seconds for a duration exercise', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    await user.click(screen.getByRole('button', { name: /Plank/ }));

    expect(screen.getByLabelText('Set 1, seconds')).toHaveValue('45');
  });

  it('shows the stale-session alert after twelve hours', async () => {
    workoutMockState.currentSession = createInProgressSession({
      startedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    });
    workoutMockState.sessions[SESSION_ID] = workoutMockState.currentSession;
    renderClient(`/client/workout/${SESSION_ID}`);

    expect(
      await screen.findByText(/This session started 1 day ago/, undefined, { timeout }),
    ).toBeInTheDocument();
  });

  it('cancels an in-progress session after confirm', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    await user.click(screen.getByRole('button', { name: workoutCopy.focus.cancel }));
    const dialog = await screen.findByRole('dialog', undefined, { timeout });
    await user.click(
      within(dialog).getByRole('button', { name: workoutCopy.focus.cancelConfirm }),
    );

    expect(
      await screen.findByRole('heading', { name: workoutCopy.hub.title }, { timeout }),
    ).toBeInTheDocument();
    expect(workoutMockState.sessions[SESSION_ID]?.status).toBe('CANCELLED');
  });

  it('maps a foreign session id to a safe not-found state', async () => {
    renderClient(`/client/workout/${FOREIGN_SESSION_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Not found' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('This resource is not available.')).toBeInTheDocument();
    expect(screen.queryByText(FOREIGN_SESSION_ID)).not.toBeInTheDocument();
    expect(screen.queryByText('Forbidden internals must not leak')).not.toBeInTheDocument();
  });

  it('maps unexpected 403 without leaking the API message', async () => {
    workoutMockState.sessionStatus = 403;
    renderClient(`/client/workout/${SESSION_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Not allowed' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Forbidden internals must not leak')).not.toBeInTheDocument();
  });
});
