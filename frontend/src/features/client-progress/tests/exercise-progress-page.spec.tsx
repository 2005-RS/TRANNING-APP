import { render, screen } from '@testing-library/react';
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
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  progressMockState,
  resetProgressMockState,
} from '@/features/client-progress/tests/msw-progress';
import {
  MISSING_EXERCISE_ID,
  SQUAT_EXERCISE_ID,
  populatedExerciseDetail,
} from '@/features/client-progress/tests/fixtures';

const timeout = 4000;

function renderDetail(path: string) {
  return render(
    <TestApp initialEntry={path} status="AUTHENTICATED" user={clientA} />,
  );
}

describe('Exercise progress detail', { timeout: 15_000 }, () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetProgressMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('renders highest-in-period values and history without leaking internals', async () => {
    progressMockState.exerciseDetail = populatedExerciseDetail;
    renderDetail(`/client/progress/exercises/${SQUAT_EXERCISE_ID}?period=30`);

    expect(
      await screen.findByRole('heading', { name: 'Back squat' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.detail.highestLoad)).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.detail.estimated1RmHint)).toBeInTheDocument();
    expect(screen.getByText('Lower A')).toBeInTheDocument();
    expect(screen.queryByText(SQUAT_EXERCISE_ID)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
  });

  it('shows a 404 empty-history state inside the Client shell', async () => {
    renderDetail(`/client/progress/exercises/${MISSING_EXERCISE_ID}`);

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.detail.notFound }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(clientProgressCopy.detail.notFoundHint)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
    expect(screen.queryByText('Exercise progress not found')).not.toBeInTheDocument();
  });

  it('maps 403 without leaking the API message', async () => {
    progressMockState.detailStatus = 403;
    renderDetail(`/client/progress/exercises/${SQUAT_EXERCISE_ID}`);

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.detail.forbidden }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Forbidden internals must not leak')).not.toBeInTheDocument();
  });

  it('rejects a non-UUID exercise id without fetching', async () => {
    renderDetail('/client/progress/exercises/not-a-uuid');

    expect(
      await screen.findByRole('heading', { name: clientProgressCopy.detail.invalidId }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: clientCopy.mainNav })).toBeInTheDocument();
  });
});
