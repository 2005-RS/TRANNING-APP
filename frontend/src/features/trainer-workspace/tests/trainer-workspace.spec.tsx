import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { adminA, clientA, trainerA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import {
  TRAINER_ADMIN_EXERCISE_ID,
  TRAINER_CHECK_IN_ID,
  TRAINER_CLIENT_A_ID,
  TRAINER_CREATED_EXERCISE_ID,
  TRAINER_EXERCISE_B_ID,
  TRAINER_EXERCISE_ID,
  TRAINER_TEMPLATE_B_ID,
  SIGNED_EXERCISE_MEDIA_URL,
  adminCatalogExercise,
  readyExerciseImage,
} from '@/features/trainer-workspace/tests/fixtures';
import {
  trainerMockState,
  resetTrainerMockState,
  usePopulatedTrainerWorkspace,
  useWorkoutTemplateBuilder,
} from '@/features/trainer-workspace/tests/msw-trainer';
import {
  CheckInResponseDtoStatus,
  ExerciseResponseDtoStatus,
  WorkoutTemplateExerciseInputDtoPrescriptionType,
} from '@/generated/models';

const timeout = 4000;

function renderTrainer(entry = '/trainer/dashboard') {
  return render(
    <TestApp initialEntry={entry} status="AUTHENTICATED" user={trainerA} />,
  );
}

function requireElement(element: HTMLElement | undefined): HTMLElement {
  expect(element).toBeTruthy();
  return element as HTMLElement;
}

describe('Trainer workspace', () => {
  beforeEach(() => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetTrainerMockState();
    resetAuthBootstrap();
    clearAccessToken();
  });

  afterEach(() => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
  });

  it('shows a dashboard skeleton then the empty assigned-clients state', async () => {
    trainerMockState.delayMs = 800;
    renderTrainer();
    expect(
      await screen.findByRole('status', { name: trainerWorkspaceCopy.dashboard.loadingLabel }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.dashboard.emptyTitle }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  }, 15_000);

  it('renders pending check-ins and does not invent engagement metrics', async () => {
    usePopulatedTrainerWorkspace();
    renderTrainer();
    expect(await screen.findByRole('heading', { name: trainerWorkspaceCopy.dashboard.pendingCheckIns }, { timeout })).toBeInTheDocument();
    expect(screen.getAllByText('Ada Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: trainerWorkspaceCopy.dashboard.reviewCheckIn })).toHaveAttribute(
      'href',
      `/trainer/clients/${TRAINER_CLIENT_A_ID}/check-ins/${TRAINER_CHECK_IN_ID}`,
    );
    expect(screen.queryByText(/revenue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/adherence score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(TRAINER_CLIENT_A_ID)).not.toBeInTheDocument();
  });

  it('lists assigned clients with search', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer('/trainer/clients');
    expect(await screen.findByRole('heading', { name: trainerWorkspaceCopy.clients.title }, { timeout })).toBeInTheDocument();
    expect(screen.getAllByText('Ada Client').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bea Client').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.clients.searchLabel), 'Ada');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.search }));
    expect((await screen.findAllByText('Ada Client', undefined, { timeout })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Bea Client')).not.toBeInTheDocument();
  });

  it('opens client context and does not flash the previous client after switching', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer('/trainer/clients');
    await screen.findByRole('heading', { name: trainerWorkspaceCopy.clients.title }, { timeout });
    await user.click(screen.getAllByRole('link', { name: 'Open Ada Client' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Ada Client' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: trainerWorkspaceCopy.workspace.contextLabel })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: trainerWorkspaceCopy.workspace.backToClients }));
    await screen.findByRole('heading', { name: trainerWorkspaceCopy.clients.title }, { timeout });
    await user.click(screen.getAllByRole('link', { name: 'Open Bea Client' })[0]!);
    expect(await screen.findByRole('heading', { name: 'Bea Client' }, { timeout })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ada Client' })).not.toBeInTheDocument();
  }, 12_000);

  it('reviews a submitted check-in and does not expose drafts', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/check-ins/${TRAINER_CHECK_IN_ID}`);
    expect(await screen.findByLabelText(trainerWorkspaceCopy.checkIns.feedback, undefined, { timeout })).toBeInTheDocument();
    expect(screen.queryByText('DRAFT')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.checkIns.feedback), 'Keep the current volume.');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.checkIns.submitReview }));
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.checkIns.reviewed }, { timeout }),
    ).toBeInTheDocument();
    expect(trainerMockState.checkIn.status).toBe(CheckInResponseDtoStatus.REVIEWED);
    expect(trainerMockState.lastReviewBody).toEqual({
      feedback: 'Keep the current volume.',
      actionItems: null,
    });
  }, 12_000);

  it('preserves decimal nutrition targets on create', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/nutrition`);
    expect(await screen.findByLabelText(trainerWorkspaceCopy.nutrition.name, undefined, { timeout })).toBeInTheDocument();
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.nutrition.name), 'Cut block');
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.nutrition.calories), '2125.5');
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.nutrition.protein), '170.25');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.nutrition.create }));
    await waitFor(() => {
      expect(trainerMockState.lastNutritionCreate).toMatchObject({
        name: 'Cut block',
        targetCaloriesKcal: 2125.5,
        targetProteinG: 170.25,
      });
    });
  });

  it('sends the training plan create payload', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/training`);
    expect(await screen.findByLabelText(trainerWorkspaceCopy.training.name, undefined, { timeout })).toBeInTheDocument();
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.training.name), 'Strength block');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.training.create }));
    expect(trainerMockState.lastTrainingCreate).toMatchObject({ name: 'Strength block' });
  });

  it('keeps CLIENT out of trainer routes', async () => {
    render(
      <TestApp initialEntry="/trainer/dashboard" status="AUTHENTICATED" user={clientA} />,
    );
    expect(await screen.findByRole('heading', { name: /Ada/ }, { timeout })).toBeInTheDocument();
  });

  it('shows dashboard network errors without logging out', async () => {
    trainerMockState.failNetwork = true;
    renderTrainer();
    expect(await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: trainerWorkspaceCopy.retry })).toBeInTheDocument();
  });

  it('shows 403 without logging out', async () => {
    trainerMockState.dashboardStatus = 403;
    renderTrainer();
    expect(await screen.findByRole('heading', { name: 'Not allowed' }, { timeout })).toBeInTheDocument();
  });

  it('shows 404 on an unassigned client', async () => {
    usePopulatedTrainerWorkspace();
    trainerMockState.clientStatus = 404;
    renderTrainer('/trainer/clients/cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.workspace.notFoundTitle }, { timeout }),
    ).toBeInTheDocument();
  });

  it('surfaces a 409 on review conflict', async () => {
    usePopulatedTrainerWorkspace();
    trainerMockState.checkInStatus = 409;
    const user = userEvent.setup();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/check-ins/${TRAINER_CHECK_IN_ID}`);
    await screen.findByLabelText(trainerWorkspaceCopy.checkIns.feedback, undefined, { timeout });
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.checkIns.feedback), 'Notes');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.checkIns.submitReview }));
    expect(await screen.findByRole('alert', undefined, { timeout })).toBeInTheDocument();
  });

  it('renders progress empty facts without invented scores', async () => {
    usePopulatedTrainerWorkspace();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/progress`);
    expect(await screen.findByText(trainerWorkspaceCopy.progress.empty, undefined, { timeout })).toBeInTheDocument();
    expect(screen.queryByText(/readiness/i)).not.toBeInTheDocument();
  });

  it('renders body measurements and omits photo UI internals', async () => {
    usePopulatedTrainerWorkspace();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/body`);
    expect(await screen.findByRole('heading', { name: trainerWorkspaceCopy.body.measurements }, { timeout })).toBeInTheDocument();
    expect(
      await screen.findByText(/82\.4/, undefined, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText(TRAINER_CLIENT_A_ID)).not.toBeInTheDocument();
  });

  it('hides photos when the API forbids them', async () => {
    usePopulatedTrainerWorkspace();
    trainerMockState.photosStatus = 403;
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/body`);
    expect(
      await screen.findByText(trainerWorkspaceCopy.body.photosForbidden, undefined, { timeout }),
    ).toBeInTheDocument();
  });

  it('does not persist signed photo URLs in web storage', async () => {
    usePopulatedTrainerWorkspace();
    renderTrainer(`/trainer/clients/${TRAINER_CLIENT_A_ID}/body`);
    expect(await screen.findByRole('img', undefined, { timeout })).toBeInTheDocument();
    expect(window.localStorage.getItem('https://signed.example.test/photo')).toBeNull();
    expect(JSON.stringify(window.localStorage)).not.toContain('signed.example.test');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('signed.example.test');
  });

  it('keeps ADMIN out of trainer routes', async () => {
    render(
      <TestApp initialEntry="/trainer/dashboard" status="AUTHENTICATED" user={adminA} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('router-href').textContent).toBe('/admin/dashboard');
    });
    expect(screen.queryByRole('heading', { name: trainerWorkspaceCopy.dashboard.pendingCheckIns })).not.toBeInTheDocument();
  });

  it('keeps the template library primary and creates from a sheet', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer('/trainer/training');
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.templates.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: trainerWorkspaceCopy.templates.libraryTitle })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: `${trainerWorkspaceCopy.templates.openTemplate} Lower A` }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Push Strength')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.templates.create }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.templates.name), 'Pull Hypertrophy');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.templates.submitCreate }));
    await waitFor(() => {
      expect(trainerMockState.lastTemplateCreate).toEqual({ name: 'Pull Hypertrophy' });
    });
  }, 12_000);

  it('filters templates through the API search and status contract', async () => {
    usePopulatedTrainerWorkspace();
    const user = userEvent.setup();
    renderTrainer('/trainer/training');
    await screen.findByRole('link', { name: `${trainerWorkspaceCopy.templates.openTemplate} Lower A` }, { timeout });
    await user.selectOptions(screen.getByLabelText(trainerWorkspaceCopy.templates.statusFilter), 'DRAFT');
    expect(
      await screen.findByRole('link', { name: `${trainerWorkspaceCopy.templates.openTemplate} Push Strength` }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Lower A')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(trainerWorkspaceCopy.templates.searchLabel), 'zzzz');
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.templates.noMatches }, { timeout }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.clearFilters }));
    expect(
      await screen.findByRole('link', { name: `${trainerWorkspaceCopy.templates.openTemplate} Lower A` }, { timeout }),
    ).toBeInTheDocument();
  }, 12_000);

  it('uses a distinct empty catalog state without the filter toolbar', async () => {
    renderTrainer('/trainer/training');
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.templates.emptyTitle }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.templates.emptyBody)).toBeInTheDocument();
    expect(screen.queryByLabelText(trainerWorkspaceCopy.templates.searchLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: trainerWorkspaceCopy.templates.noMatches })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: trainerWorkspaceCopy.templates.emptyCreate }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows a builder empty state and keeps Activate disabled without exercises', async () => {
    useWorkoutTemplateBuilder('empty-draft');
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    expect(
      await screen.findByRole('heading', { name: 'Push Strength' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 exercises')).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.templates.builderEmptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: trainerWorkspaceCopy.activate })).toBeDisabled();
    expect(screen.queryByLabelText(/exercise id/i)).not.toBeInTheDocument();
  });

  it('adds an exercise from the catalog picker with an explicit save', async () => {
    useWorkoutTemplateBuilder('empty-draft');
    const user = userEvent.setup();
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.templates.builderEmptyTitle }, { timeout }),
    ).toBeInTheDocument();
    const addButtons = screen.getAllByRole('button', { name: trainerWorkspaceCopy.templates.addExercise });
    await user.click(requireElement(addButtons[addButtons.length - 1]));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /Back squat/ }, { timeout }));
    await user.click(within(dialog).getByRole('button', { name: trainerWorkspaceCopy.templates.addExercise }));
    await waitFor(() => {
      expect(trainerMockState.lastTemplateReplace?.items).toHaveLength(1);
    });
    expect(trainerMockState.lastTemplateReplace?.items[0]).toEqual(
      expect.objectContaining({
        exerciseId: TRAINER_EXERCISE_ID,
        sets: 3,
        prescriptionType: WorkoutTemplateExerciseInputDtoPrescriptionType.REPS,
        restSeconds: 90,
        repsMin: 8,
        repsMax: 10,
      }),
    );
    expect(await screen.findByText('Back squat', undefined, { timeout })).toBeInTheDocument();
    expect(screen.getByText(/3 sets · 8–10 reps · 90s rest/)).toBeInTheDocument();
  });

  it('does not save prescription edits on blur', async () => {
    useWorkoutTemplateBuilder('populated-draft');
    const user = userEvent.setup();
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    expect(await screen.findByText('Back squat', undefined, { timeout })).toBeInTheDocument();
    await user.click(requireElement(screen.getAllByRole('button', { name: trainerWorkspaceCopy.templates.editExercise })[0]));
    const dialog = await screen.findByRole('dialog');
    const sets = within(dialog).getByLabelText(trainerWorkspaceCopy.training.sets);
    await user.clear(sets);
    await user.type(sets, '5');
    await user.tab();
    await user.click(within(dialog).getByRole('button', { name: trainerWorkspaceCopy.templates.cancel }));
    expect(trainerMockState.lastTemplateReplace).toBeNull();
    expect(screen.getByText(/4 sets · 8–10 reps · 120s rest/)).toBeInTheDocument();
  });

  it('saves an edited prescription only with Save prescription', async () => {
    useWorkoutTemplateBuilder('populated-draft');
    const user = userEvent.setup();
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    expect(await screen.findByText('Bench press', undefined, { timeout })).toBeInTheDocument();
    await user.click(requireElement(screen.getAllByRole('button', { name: trainerWorkspaceCopy.templates.editExercise })[0]));
    const dialog = await screen.findByRole('dialog');
    const sets = within(dialog).getByLabelText(trainerWorkspaceCopy.training.sets);
    await user.clear(sets);
    await user.type(sets, '5');
    await user.click(within(dialog).getByRole('button', { name: trainerWorkspaceCopy.templates.savePrescription }));
    await waitFor(() => {
      expect(trainerMockState.lastTemplateReplace?.items[0]?.sets).toBe(5);
    });
    expect(trainerMockState.lastTemplateReplace?.items[0]?.exerciseId).toBe(TRAINER_EXERCISE_ID);
  });

  it('reorders exercises through the replace-items contract', async () => {
    useWorkoutTemplateBuilder('populated-draft');
    const user = userEvent.setup();
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    expect(await screen.findByText('Bench press', undefined, { timeout })).toBeInTheDocument();
    await user.click(requireElement(screen.getAllByRole('button', { name: trainerWorkspaceCopy.templates.moveDown })[0]));
    await waitFor(() => {
      expect(trainerMockState.lastTemplateReplace?.items.map((item) => item.exerciseId)).toEqual([
        TRAINER_EXERCISE_B_ID,
        TRAINER_EXERCISE_ID,
      ]);
    });
  });

  it('does not persist signed exercise media URLs in web storage', async () => {
    useWorkoutTemplateBuilder('populated-draft');
    renderTrainer(`/trainer/training/${TRAINER_TEMPLATE_B_ID}`);
    await waitFor(
      () => {
        expect(document.querySelector(`img[src="${SIGNED_EXERCISE_MEDIA_URL}"]`)).not.toBeNull();
      },
      { timeout },
    );
    expect(window.localStorage.getItem(SIGNED_EXERCISE_MEDIA_URL)).toBeNull();
    expect(JSON.stringify(window.localStorage)).not.toContain('signed.example.test');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('signed.example.test');
  });

  it('presents the exercise library as compact cards and creates from a sheet', async () => {
    const user = userEvent.setup();
    renderTrainer('/trainer/exercises');
    expect(
      await screen.findByRole('heading', { name: trainerWorkspaceCopy.exercises.title }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.exercises.libraryHeading)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.create }));
    const dialog = await screen.findByRole('dialog', { name: trainerWorkspaceCopy.exercises.createTitle });
    expect(within(dialog).getByLabelText(trainerWorkspaceCopy.exercises.name)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: trainerWorkspaceCopy.templates.close }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole('link', { name: trainerWorkspaceCopy.exercises.open }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Back squat' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  }, 15_000);

  it('filters the exercise library by search and muscle without a permanent create form', async () => {
    const user = userEvent.setup();
    usePopulatedTrainerWorkspace();
    renderTrainer('/trainer/exercises');
    expect(await screen.findByRole('heading', { name: 'Back squat' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench press' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: trainerWorkspaceCopy.exercises.searchPlaceholder }),
      'bench',
    );
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.search }));
    expect(await screen.findByRole('heading', { name: 'Bench press' }, { timeout })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Back squat' })).not.toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: trainerWorkspaceCopy.exercises.searchPlaceholder }));
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.search }));
    expect(await screen.findByRole('heading', { name: 'Back squat' }, { timeout })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(trainerWorkspaceCopy.exercises.muscleFilter),
      'CHEST',
    );
    expect(await screen.findByRole('heading', { name: 'Bench press' }, { timeout })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Back squat' })).not.toBeInTheDocument();
  }, 15_000);

  it('shows a no-media fallback and loads READY demonstration media without persisting signed URLs', async () => {
    usePopulatedTrainerWorkspace();
    trainerMockState.exerciseMedia = {
      [TRAINER_EXERCISE_ID]: [structuredClone(readyExerciseImage)],
    };
    renderTrainer('/trainer/exercises');
    expect(await screen.findByRole('heading', { name: 'Back squat' }, { timeout })).toBeInTheDocument();
    expect(screen.getAllByText(trainerWorkspaceCopy.exercises.mediaEmpty).length).toBeGreaterThan(0);
    await waitFor(
      () => {
        expect(document.querySelector(`img[src="${SIGNED_EXERCISE_MEDIA_URL}"]`)).not.toBeNull();
      },
      { timeout },
    );
    expect(JSON.stringify(window.localStorage)).not.toContain('signed.example.test');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('signed.example.test');
  }, 15_000);

  it('lets the owning trainer upload demonstration media through signed POST then finalize', async () => {
    const user = userEvent.setup();
    renderTrainer(`/trainer/exercises/${TRAINER_EXERCISE_ID}`);
    expect(
      await screen.findByRole('button', { name: trainerWorkspaceCopy.exercises.upload }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    const file = new File(['fake-bytes'], 'squat.mp4', { type: 'video/mp4' });
    await user.upload(screen.getByLabelText(trainerWorkspaceCopy.exercises.file), file);
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.upload }));
    await waitFor(
      () => {
        expect(trainerMockState.lastStoragePosted).toBe(true);
      },
      { timeout: 10_000 },
    );
    expect(trainerMockState.lastUploadRequest?.mimeType).toBe('video/mp4');
    expect(trainerMockState.lastUploadRequest?.mediaType).toBe('VIDEO');
    expect(await screen.findByText('squat.mp4', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.status.READY)).toBeInTheDocument();
    expect(JSON.stringify(window.localStorage)).not.toContain('storage.test');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('storage.test');
    expect(JSON.stringify(window.localStorage)).not.toContain('signed.example.test');
  }, 15_000);

  it('keeps upload hidden on archived owned exercises', async () => {
    trainerMockState.exercises = [
      { ...trainerMockState.exercises[0]!, status: ExerciseResponseDtoStatus.ARCHIVED },
    ];
    renderTrainer(`/trainer/exercises/${TRAINER_EXERCISE_ID}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Back squat' }, { timeout })).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.exercises.archivedNoUpload)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: trainerWorkspaceCopy.exercises.upload })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(trainerWorkspaceCopy.exercises.file)).not.toBeInTheDocument();
  }, 15_000);

  it('shows an inline error when object storage rejects the signed POST', async () => {
    const user = userEvent.setup();
    trainerMockState.failStorage = true;
    renderTrainer(`/trainer/exercises/${TRAINER_EXERCISE_ID}`);
    await screen.findByRole('button', { name: trainerWorkspaceCopy.exercises.upload }, { timeout: 10_000 });
    const file = new File(['fake-bytes'], 'squat.mp4', { type: 'video/mp4' });
    await user.upload(screen.getByLabelText(trainerWorkspaceCopy.exercises.file), file);
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.upload }));
    expect(await screen.findByRole('alert', {}, { timeout: 10_000 })).toHaveTextContent(
      trainerWorkspaceCopy.exercises.uploadFailed,
    );
    expect(trainerMockState.lastStoragePosted).toBe(false);
    expect(JSON.stringify(window.localStorage)).not.toContain('storage.test');
  }, 15_000);

  it('hides upload and delete on Admin-owned catalog exercises', async () => {
    trainerMockState.exercises = [adminCatalogExercise];
    trainerMockState.exerciseMedia = {
      [TRAINER_ADMIN_EXERCISE_ID]: [structuredClone(readyExerciseImage)],
    };
    renderTrainer(`/trainer/exercises/${TRAINER_ADMIN_EXERCISE_ID}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Vital bench press' }, { timeout }),
    ).toBeInTheDocument();
    expect(screen.getByText(trainerWorkspaceCopy.exercises.catalogReadOnly)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: trainerWorkspaceCopy.exercises.upload })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: trainerWorkspaceCopy.exercises.delete })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(trainerWorkspaceCopy.exercises.file)).not.toBeInTheDocument();
  }, 15_000);

  it('rejects GIF before requesting an upload', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderTrainer(`/trainer/exercises/${TRAINER_EXERCISE_ID}`);
    await screen.findByRole('button', { name: trainerWorkspaceCopy.exercises.upload }, { timeout: 10_000 });
    const file = new File(['gif'], 'demo.gif', { type: 'image/gif' });
    await user.upload(screen.getByLabelText(trainerWorkspaceCopy.exercises.file), file);
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.upload }));
    expect(await screen.findByRole('alert', {}, { timeout })).toHaveTextContent(
      trainerWorkspaceCopy.exercises.badType,
    );
    expect(trainerMockState.lastUploadRequest).toBeNull();
    expect(trainerMockState.lastStoragePosted).toBe(false);
  }, 15_000);

  it('deletes owned media after confirmation', async () => {
    const user = userEvent.setup();
    trainerMockState.exerciseMedia = {
      [TRAINER_EXERCISE_ID]: [structuredClone(readyExerciseImage)],
    };
    renderTrainer(`/trainer/exercises/${TRAINER_EXERCISE_ID}`);
    await screen.findByRole('heading', { level: 1, name: 'Back squat' }, { timeout });
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.delete }));
    await user.click(
      await screen.findByRole('button', { name: trainerWorkspaceCopy.exercises.confirmDelete }, { timeout }),
    );
    await waitFor(() => {
      expect(trainerMockState.lastDeletedMediaId).toBe(readyExerciseImage.id);
    });
  }, 15_000);

  it('opens the new exercise detail after create so media can be uploaded', async () => {
    const user = userEvent.setup();
    renderTrainer('/trainer/exercises');
    await screen.findByRole('heading', { name: trainerWorkspaceCopy.exercises.title }, { timeout });
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.create }));
    const dialog = await screen.findByRole('dialog', { name: trainerWorkspaceCopy.exercises.createTitle });
    expect(within(dialog).getByText(trainerWorkspaceCopy.exercises.createThenUpload, { exact: false })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(trainerWorkspaceCopy.exercises.name), 'Cable curl');
    await user.click(within(dialog).getByRole('button', { name: trainerWorkspaceCopy.exercises.create }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Cable curl' }, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: trainerWorkspaceCopy.exercises.upload })).toBeInTheDocument();
    expect(TRAINER_CREATED_EXERCISE_ID).toBeTruthy();
  }, 15_000);
});
