import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { clientA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { clientWelcomeCopy } from '@/features/client-welcome/copy';
import { greetingHeadline } from '@/features/client-dashboard/lib/greeting';
import { clientCopy } from '@/features/navigation/copy';
import { workoutMockState } from '@/features/workout-session/tests/msw-workout';

const timeout = 10_000;

function renderWelcome() {
  return render(
    <TestApp initialEntry="/client/welcome" status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Client welcome', () => {
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

  it('shows the first step with the client first name', async () => {
    renderWelcome();

    expect(
      await screen.findByRole(
        'heading',
        { name: clientWelcomeCopy.welcome.replace('{{name}}', clientA.firstName) },
        { timeout },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(clientWelcomeCopy.progress(1))).toBeInTheDocument();
  });

  it('skips welcome and opens the dashboard', async () => {
    const user = userEvent.setup();
    renderWelcome();

    await screen.findByRole(
      'heading',
      { name: clientWelcomeCopy.welcome.replace('{{name}}', clientA.firstName) },
      { timeout },
    );
    await user.click(screen.getByRole('button', { name: clientWelcomeCopy.skip }));

    expect(
      await screen.findByRole(
        'heading',
        { name: greetingHeadline(clientA.firstName) },
        { timeout },
      ),
    ).toBeInTheDocument();
  });

  it('creates a self plan and starts its first workout', async () => {
    const user = userEvent.setup();
    renderWelcome();

    await screen.findByRole(
      'heading',
      { name: clientWelcomeCopy.welcome.replace('{{name}}', clientA.firstName) },
      { timeout },
    );
    await user.click(screen.getByRole('button', { name: clientWelcomeCopy.next }));
    await screen.findByRole('heading', { name: clientWelcomeCopy.choose }, { timeout });
    await user.click(screen.getAllByRole('button', { name: clientWelcomeCopy.useRoutine })[0]!);

    expect(
      await screen.findByRole('heading', { name: clientWelcomeCopy.ready }, { timeout }),
    ).toBeInTheDocument();
    expect(workoutMockState.lastCreateSelfPlan).toEqual({
      workouts: [{ workoutTemplateId: workoutMockState.library[0]!.id }],
    });

    await user.click(screen.getByRole('button', { name: clientWelcomeCopy.start }));
    expect(
      await screen.findByRole('link', { name: clientCopy.workout.close }, { timeout }),
    ).toBeInTheDocument();
  });
});
