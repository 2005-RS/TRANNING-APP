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

  it('logs a set against the generated replace-sets contract and shows rest remaining', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    expect(
      await screen.findByRole('heading', { name: 'Lower A' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(workoutCopy.focus.load)).toHaveValue('80');
    expect(screen.getByLabelText(workoutCopy.focus.reps)).toHaveValue('8');
    expect(screen.queryByRole('navigation', { name: clientCopy.mainNav })).not.toBeInTheDocument();
    expect(screen.queryByText(SESSION_ID)).not.toBeInTheDocument();
    expect(screen.queryByText(SQUAT_SESSION_EXERCISE_ID)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: workoutCopy.focus.logSet }));

    expect(
      await screen.findByRole('timer', undefined, { timeout }),
    ).toHaveAccessibleName(`${workoutCopy.focus.restRemaining} 1:30`);
    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 4/)).toBeInTheDocument();
    expect(workoutMockState.lastReplaceSets).toEqual({
      sessionId: SESSION_ID,
      sessionExerciseId: SQUAT_SESSION_EXERCISE_ID,
      sets: [{ actualReps: 8, actualLoadKg: 80 }],
    });
  });

  it('requires a recorded set before complete and then finishes the session', async () => {
    const user = userEvent.setup();
    workoutMockState.currentSession = createInProgressSession();
    renderClient(`/client/workout/${SESSION_ID}`);

    await screen.findByRole('heading', { name: 'Lower A' }, { timeout });
    expect(screen.getByRole('button', { name: workoutCopy.focus.complete })).toBeDisabled();
    expect(screen.getByText(workoutCopy.focus.completeNeedSets)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: workoutCopy.focus.logSet }));
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
      await screen.findByRole('heading', { name: workoutCopy.hub.title }, { timeout }),
    ).toBeInTheDocument();
    expect(workoutMockState.sessions[SESSION_ID]?.status).toBe('COMPLETED');
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
