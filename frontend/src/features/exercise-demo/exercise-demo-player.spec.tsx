import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestProviders } from '@/features/auth/tests/render';
import { trainerA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import type { ExerciseDemoLabels } from '@/features/exercise-demo/demo-media';
import {
  SIGNED_EXERCISE_MEDIA_URL,
  TRAINER_EXERCISE_ID,
  readyExerciseImage,
} from '@/features/trainer-workspace/tests/fixtures';
import { trainerMockState } from '@/features/trainer-workspace/tests/msw-trainer';

const MEDIA_LIST_URL = `http://localhost:3000/api/v1/exercises/:exerciseId/media`;

const labels: ExerciseDemoLabels = {
  play: 'Play demonstration',
  pause: 'Pause demonstration',
  loading: 'Loading demonstration',
  empty: 'No demonstration',
  failed: 'Demonstration unavailable',
  retry: 'Retry',
};

// The component only enables its queries once the frame is near the viewport, so
// the observer has to stay silent to reproduce a thumbnail below the fold.
class OffscreenObserver {
  static latest: OffscreenObserver | null = null;
  private readonly notify: (entries: Array<{ isIntersecting: boolean }>) => void;

  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.notify = callback;
    OffscreenObserver.latest = this;
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  scrollIntoView() {
    this.notify([{ isIntersecting: true }]);
  }
}

function scrollIntoView() {
  act(() => {
    OffscreenObserver.latest?.scrollIntoView();
  });
}

function renderPlayer() {
  return render(
    <TestProviders status="AUTHENTICATED" user={trainerA}>
      <ExerciseDemoPlayer
        exerciseId={TRAINER_EXERCISE_ID}
        exerciseName="Back squat"
        loadCatalogMedia
        variant="card"
        playback="hover"
        labels={labels}
      />
    </TestProviders>,
  );
}

describe('ExerciseDemoPlayer', () => {
  beforeEach(() => {
    OffscreenObserver.latest = null;
    vi.stubGlobal('IntersectionObserver', OffscreenObserver);
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    vi.unstubAllGlobals();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('rests in the empty state until the frame scrolls into view', async () => {
    trainerMockState.exerciseMedia = {
      [TRAINER_EXERCISE_ID]: [structuredClone(readyExerciseImage)],
    };
    renderPlayer();

    expect(screen.getByText(labels.empty)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    scrollIntoView();

    expect(await screen.findByRole('presentation')).toHaveAttribute(
      'src',
      SIGNED_EXERCISE_MEDIA_URL,
    );
  });

  it('stays in the empty state when the exercise has no media', async () => {
    trainerMockState.exerciseMedia = {};
    renderPlayer();
    scrollIntoView();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  it('offers a retry instead of an empty state when the media list fails', async () => {
    trainerMockState.exerciseMedia = {
      [TRAINER_EXERCISE_ID]: [structuredClone(readyExerciseImage)],
    };
    authServer.use(
      http.get(MEDIA_LIST_URL, () =>
        HttpResponse.json(
          {
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Unexpected error',
            path: `/api/v1/exercises/${TRAINER_EXERCISE_ID}/media`,
            timestamp: '2026-09-29T00:00:00.000Z',
            requestId: 'req-media-list',
          },
          { status: 500 },
        ),
      ),
    );
    renderPlayer();
    scrollIntoView();

    expect(
      await screen.findByText(labels.failed, undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(labels.empty)).not.toBeInTheDocument();

    authServer.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: labels.retry }));

    expect(
      await screen.findByRole('presentation', undefined, { timeout: 10_000 }),
    ).toHaveAttribute('src', SIGNED_EXERCISE_MEDIA_URL);
  }, 20_000);
});
