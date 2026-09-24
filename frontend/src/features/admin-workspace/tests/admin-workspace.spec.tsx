import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApp } from '@/features/auth/tests/render';
import { adminA, clientA, trainerA } from '@/features/auth/tests/fixtures';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { clearAccessToken } from '@/shared/lib/access-token';
import { adminWorkspaceCopy, adminWorkspaceCopySource } from '@/features/admin-workspace/copy';
import { greetingHeadline } from '@/features/client-dashboard/lib/greeting';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { changeAppLanguage } from '@/i18n/language';
import { esAdminWorkspace } from '@/i18n/locales/es/admin';
import {
  ADMIN_CLIENT_ID,
  ADMIN_EXERCISE_ID,
  ADMIN_FOOD_ID,
  ADMIN_MEDIA_ID,
  ADMIN_TRAINER_ID,
  SIGNED_ADMIN_MEDIA_URL,
  adminHandlers,
  adminMockState,
  adminTrainer,
  useEmptyAdminCatalogs,
} from '@/features/admin-workspace/tests/msw-admin';

const timeout = 4000;
const copy = adminWorkspaceCopy;

function renderAdmin(entry = '/admin/dashboard') {
  return render(<TestApp initialEntry={entry} status="AUTHENTICATED" user={adminA} />);
}

function assignCurrentTrainer() {
  adminMockState.assignment = {
    id: 'abababab-abab-4aba-8aba-abababababab',
    trainer: adminMockState.trainers[0]!,
    assignedAt: '2026-09-01T00:00:00.000Z',
  };
  adminMockState.history = [
    { ...adminMockState.assignment, assignedByUserId: adminA.id, endedAt: null, endedByUserId: null },
  ];
}

describe('Admin workspace', () => {
  beforeEach(async () => {
    authServer.listen({ onUnhandledRequest: 'error' });
    resetAuthMockState();
    resetAuthBootstrap();
    clearAccessToken();
    await changeAppLanguage('en');
    authServer.use(...adminHandlers);
  });

  afterEach(async () => {
    authServer.resetHandlers();
    authServer.close();
    resetAuthBootstrap();
    clearAccessToken();
    await changeAppLanguage('en');
  });

  describe('dashboard', () => {
    it('shows a skeleton, then coverage and counts without inbox or private metrics', async () => {
      adminMockState.delayMs = 800;
      renderAdmin();
      expect(
        await screen.findByRole('status', { name: copy.dashboard.loadingLabel }, { timeout: 10_000 }),
      ).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: copy.dashboard.title }, { timeout: 10_000 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: copy.dashboard.coverageTitle })).toBeInTheDocument();
      expect(screen.getByText(copy.dashboard.activeTrainers)).toBeInTheDocument();
      expect(screen.getByText(copy.dashboard.pendingCheckIns)).toBeInTheDocument();
      expect(screen.queryByText('99')).not.toBeInTheDocument();
      expect(screen.queryByText(/body fat|kg|progress photo/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /check-in/i })).not.toBeInTheDocument();
    }, 15_000);

    it('links unassigned coverage to Assignments', async () => {
      renderAdmin();
      const cta = await screen.findByRole('link', { name: copy.dashboard.reviewUnassigned }, { timeout });
      expect(cta).toHaveAttribute('href', '/admin/assignments');
    });

    it('switches language without refetching the dashboard', async () => {
      renderAdmin();
      await screen.findByRole('heading', { name: copy.dashboard.title }, { timeout });
      const requests = adminMockState.dashboardRequests;
      await act(async () => {
        await changeAppLanguage('es');
      });
      expect(
        await screen.findByRole('heading', { name: esAdminWorkspace.dashboard.title }, { timeout }),
      ).toBeInTheDocument();
      expect(screen.getByText(esAdminWorkspace.dashboard.coverageTitle)).toBeInTheDocument();
      expect(adminMockState.dashboardRequests).toBe(requests);
    });

    it('shows network errors without logging out', async () => {
      adminMockState.failNetwork = true;
      renderAdmin();
      expect(await screen.findByRole('heading', { name: 'Something went wrong' }, { timeout })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: copy.retry })).toBeInTheDocument();
    });
  });

  describe('trainers', () => {
    it('creates a trainer as an atomic account and filters the list', async () => {
      const user = userEvent.setup();
      renderAdmin('/admin/trainers');
      expect(await screen.findByRole('heading', { name: copy.trainers.title }, { timeout })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.trainers.newTrainer }));
      const dialog = await screen.findByRole('dialog', { name: copy.trainers.newTrainer });
      await user.type(within(dialog).getByLabelText(copy.common.email), 'neo.trainer@example.test');
      await user.type(within(dialog).getByLabelText(copy.common.password), 'temporary-pass');
      await user.type(within(dialog).getByLabelText(copy.common.firstName), 'Neo');
      await user.type(within(dialog).getByLabelText(copy.common.lastName), 'Trainer');
      await user.click(within(dialog).getByRole('button', { name: copy.create }));
      expect(await screen.findByRole('link', { name: 'Neo Trainer' }, { timeout: 10_000 })).toBeInTheDocument();
      await user.type(screen.getByLabelText(copy.trainers.searchLabel), 'tess');
      await user.click(screen.getByRole('button', { name: copy.search }));
      expect(await screen.findByRole('link', { name: 'Tess Trainer' }, { timeout })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Neo Trainer' })).not.toBeInTheDocument();
    }, 15_000);

    it('validates inline before sending and marks invalid fields', async () => {
      const user = userEvent.setup();
      renderAdmin('/admin/trainers');
      await screen.findByRole('heading', { name: copy.trainers.title }, { timeout });
      await user.click(screen.getByRole('button', { name: copy.trainers.newTrainer }));
      const dialog = await screen.findByRole('dialog', { name: copy.trainers.newTrainer });
      await user.type(within(dialog).getByLabelText(copy.common.email), 'not-an-email');
      await user.type(within(dialog).getByLabelText(copy.common.password), 'short');
      await user.click(within(dialog).getByRole('button', { name: copy.create }));
      const email = within(dialog).getByLabelText(copy.common.email);
      await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
      expect(within(dialog).getByText(copy.common.invalidEmail)).toBeInTheDocument();
      expect(within(dialog).getByText(copy.common.passwordLength)).toBeInTheDocument();
      expect(within(dialog).getAllByText(copy.common.fieldRequired)).toHaveLength(2);
      expect(adminMockState.trainers).toHaveLength(1);
    });

    it('shows a localized duplicate-email conflict instead of backend text', async () => {
      const user = userEvent.setup();
      adminMockState.createTrainerStatus = 409;
      renderAdmin('/admin/trainers');
      await screen.findByRole('heading', { name: copy.trainers.title }, { timeout });
      await user.click(screen.getByRole('button', { name: copy.trainers.newTrainer }));
      const dialog = await screen.findByRole('dialog', { name: copy.trainers.newTrainer });
      await user.type(within(dialog).getByLabelText(copy.common.email), 'tess@example.test');
      await user.type(within(dialog).getByLabelText(copy.common.password), 'temporary-pass');
      await user.type(within(dialog).getByLabelText(copy.common.firstName), 'Tess');
      await user.type(within(dialog).getByLabelText(copy.common.lastName), 'Again');
      await user.click(within(dialog).getByRole('button', { name: copy.create }));
      expect(await within(dialog).findByText(copy.common.emailInUse, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByText('Email already in use')).not.toBeInTheDocument();
    });

    it('distinguishes a filtered empty result and clears filters', async () => {
      const user = userEvent.setup();
      renderAdmin('/admin/trainers?search=nobody');
      expect(await screen.findByRole('heading', { name: copy.common.noMatchesTitle }, { timeout })).toBeInTheDocument();
      expect(screen.queryByText(copy.trainers.emptyTitle)).not.toBeInTheDocument();
      const clearButtons = screen.getAllByRole('button', { name: copy.clearFilters });
      await user.click(clearButtons[clearButtons.length - 1]!);
      expect(await screen.findByRole('link', { name: 'Tess Trainer' }, { timeout })).toBeInTheDocument();
    });

    it('disables a trainer after confirmation', async () => {
      const user = userEvent.setup();
      renderAdmin(`/admin/trainers/${ADMIN_TRAINER_ID}`);
      expect(await screen.findByRole('heading', { name: 'Tess Trainer', level: 1 }, { timeout })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: copy.trainers.backToList })).toHaveAttribute('href', '/admin/trainers');
      await user.click(screen.getByRole('button', { name: copy.common.disable }));
      const confirm = await screen.findByRole('dialog', { name: copy.trainers.disableTitle });
      await user.click(within(confirm).getByRole('button', { name: copy.common.disable }));
      expect(await screen.findByText(copy.status.DISABLED, undefined, { timeout })).toBeInTheDocument();
    });

    it('shows 403 without logging out', async () => {
      adminMockState.trainersStatus = 403;
      renderAdmin('/admin/trainers');
      expect(await screen.findByRole('heading', { name: 'Not allowed' }, { timeout })).toBeInTheDocument();
    });
  });

  describe('clients and assignments', () => {
    it('creates a client account from the admin list', async () => {
      const user = userEvent.setup();
      renderAdmin('/admin/clients');
      expect(await screen.findByRole('heading', { name: copy.clients.title }, { timeout })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.clients.newClient }));
      const create = await screen.findByRole('dialog', { name: copy.clients.newClient });
      await user.type(within(create).getByLabelText(copy.common.email), 'beatrice@example.test');
      await user.type(within(create).getByLabelText(copy.common.password), 'temporary-pass');
      await user.type(within(create).getByLabelText(copy.common.firstName), 'Beatrice');
      await user.type(within(create).getByLabelText(copy.common.lastName), 'Client');
      await user.click(within(create).getByRole('button', { name: copy.create }));
      expect(await screen.findByRole('link', { name: 'Beatrice Client' }, { timeout })).toBeInTheDocument();
    });

    it('assigns a trainer and ends the assignment while keeping history', async () => {
      const user = userEvent.setup();
      renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);
      expect(await screen.findByRole('heading', { name: 'Ada Client', level: 1 }, { timeout })).toBeInTheDocument();
      expect(await screen.findByText(copy.clients.unassigned, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.clients.assignTrainer }));
      const assign = await screen.findByRole('dialog', { name: copy.clients.assignTrainer });
      await user.click(await within(assign).findByRole('radio', { name: /Tess Trainer/ }, { timeout }));
      await user.click(within(assign).getByRole('button', { name: copy.clients.assignTrainer }));
      expect(await screen.findByRole('button', { name: copy.clients.removeAssignment }, { timeout })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Tess Trainer' })).toHaveAttribute('href', `/admin/trainers/${ADMIN_TRAINER_ID}`);
      await user.click(screen.getByRole('button', { name: copy.clients.removeAssignment }));
      const end = await screen.findByRole('dialog', { name: copy.clients.removeTitle });
      await user.click(within(end).getByRole('button', { name: copy.clients.removeAssignment }));
      expect(await screen.findByText(copy.assignments.pastAssignment, undefined, { timeout })).toBeInTheDocument();
      expect(screen.getByText(copy.clients.unassigned)).toBeInTheDocument();
    });

    it('marks the current trainer and explains reassignment', async () => {
      const user = userEvent.setup();
      adminMockState.trainers = [
        ...adminMockState.trainers,
        {
          ...adminTrainer,
          id: '12121212-1212-4212-8212-121212121212',
          user: { ...adminTrainer.user, id: 'abab1212-1212-4212-8212-121212121212', firstName: 'Rae', email: 'rae@example.test' },
        },
      ];
      assignCurrentTrainer();
      renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);
      await user.click(await screen.findByRole('button', { name: copy.clients.changeTrainer }, { timeout }));
      const sheet = await screen.findByRole('dialog', { name: copy.clients.changeTrainer });
      expect(within(sheet).getByText(copy.clients.reassignNote)).toBeInTheDocument();
      expect(await within(sheet).findByRole('radio', { name: /Tess Trainer \(current\)/ }, { timeout })).toBeDisabled();
      expect(within(sheet).getByRole('radio', { name: /Rae Trainer/ })).toBeEnabled();
      expect(within(sheet).getByRole('button', { name: copy.clients.changeTrainer })).toBeDisabled();
    });

    it('shows a localized assignment conflict', async () => {
      const user = userEvent.setup();
      adminMockState.assignmentStatus = 409;
      renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);
      await user.click(await screen.findByRole('button', { name: copy.clients.assignTrainer }, { timeout }));
      const assign = await screen.findByRole('dialog', { name: copy.clients.assignTrainer });
      await user.click(await within(assign).findByRole('radio', { name: /Tess Trainer/ }, { timeout }));
      await user.click(within(assign).getByRole('button', { name: copy.clients.assignTrainer }));
      expect(await within(assign).findByText(copy.clients.assignmentConflict, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByText('Trainer is disabled')).not.toBeInTheDocument();
    });

    it('does not offer assignment for a disabled client', async () => {
      adminMockState.clients = adminMockState.clients.map((row) => ({
        ...row,
        user: { ...row.user, status: 'DISABLED' as const },
      }));
      renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);
      const card = await screen.findByRole('region', { name: copy.clients.assignment }, { timeout });
      expect(await within(card).findByText(copy.clients.assignDisabledHint, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: copy.clients.assignTrainer })).not.toBeInTheDocument();
    });

    it('shows 404 on a missing client', async () => {
      adminMockState.clientDetailStatus = 404;
      renderAdmin(`/admin/clients/${ADMIN_CLIENT_ID}`);
      expect(await screen.findByRole('heading', { name: 'Not found' }, { timeout })).toBeInTheDocument();
    });

    it('lists assignments with a loading state instead of a false Unassigned', async () => {
      adminMockState.assignmentReadDelayMs = 1500;
      renderAdmin('/admin/assignments');
      expect(await screen.findByRole('link', { name: 'Ada Client' }, { timeout })).toBeInTheDocument();
      expect(screen.getByRole('status', { name: copy.assignments.loadingTrainer })).toBeInTheDocument();
      expect(screen.queryByText(copy.clients.unassigned)).not.toBeInTheDocument();
      expect(await screen.findByText(copy.clients.unassigned, undefined, { timeout })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `${copy.assignments.assign}: Ada Client` })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument();
    });

    it('shows a per-row failure instead of Unassigned when the trainer lookup fails', async () => {
      adminMockState.assignmentReadStatus = 500;
      renderAdmin('/admin/assignments');
      expect(
        await screen.findByText(copy.assignments.trainerUnavailable, undefined, { timeout: 10_000 }),
      ).toBeInTheDocument();
      expect(screen.queryByText(copy.clients.unassigned)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `${copy.assignments.assign}: Ada Client` })).not.toBeInTheDocument();
    }, 15_000);
  });

  describe('exercises', () => {
    it('opens private media on demand and uploads without persisting signed URLs', async () => {
      const user = userEvent.setup();
      renderAdmin(`/admin/exercises/${ADMIN_EXERCISE_ID}`);
      expect(await screen.findByRole('heading', { name: 'Vital bench press', level: 1 }, { timeout })).toBeInTheDocument();
      expect(document.querySelector(`img[src="${SIGNED_ADMIN_MEDIA_URL}"]`)).toBeNull();
      await user.click(await screen.findByRole('button', { name: 'Open bench.jpg' }, { timeout }));
      await waitFor(() => expect(document.querySelector(`img[src="${SIGNED_ADMIN_MEDIA_URL}"]`)).not.toBeNull());
      expect(JSON.stringify(window.localStorage)).not.toContain('signed.example.test');
      expect(JSON.stringify(window.sessionStorage)).not.toContain('signed.example.test');
      await user.click(screen.getByRole('button', { name: copy.exercises.closePreview }));
      expect(document.querySelector(`img[src="${SIGNED_ADMIN_MEDIA_URL}"]`)).toBeNull();
      const file = new File(['fake-image'], 'admin-demo.jpg', { type: 'image/jpeg' });
      await user.upload(screen.getByLabelText(copy.exercises.file), file);
      expect(screen.getByText('admin-demo.jpg')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.exercises.uploadMedia }));
      expect(await screen.findByRole('button', { name: 'Open admin-demo.jpg' }, { timeout: 10_000 })).toBeInTheDocument();
      expect(adminMockState.lastStoragePosted).toBe(true);
      expect(adminMockState.lastUploadRequest?.mediaType).toBe('IMAGE');
    }, 15_000);

    it('rejects unsupported media types before requesting an upload', async () => {
      const user = userEvent.setup({ applyAccept: false });
      renderAdmin(`/admin/exercises/${ADMIN_EXERCISE_ID}`);
      await screen.findByRole('heading', { name: 'Vital bench press', level: 1 }, { timeout });
      const file = new File(['gif'], 'loop.gif', { type: 'image/gif' });
      await user.upload(screen.getByLabelText(copy.exercises.file), file);
      await user.click(screen.getByRole('button', { name: copy.exercises.uploadMedia }));
      expect(await screen.findByText(copy.exercises.unsupportedFile, undefined, { timeout })).toBeInTheDocument();
      expect(adminMockState.lastUploadRequest).toBeNull();
    });

    it('deletes exercise media after confirmation', async () => {
      const user = userEvent.setup();
      renderAdmin(`/admin/exercises/${ADMIN_EXERCISE_ID}`);
      await user.click(await screen.findByRole('button', { name: 'Delete bench.jpg' }, { timeout }));
      const confirm = await screen.findByRole('dialog', { name: copy.exercises.deleteMediaTitle });
      await user.click(within(confirm).getByRole('button', { name: copy.common.delete }));
      await waitFor(() => {
        expect(adminMockState.lastDeletedMediaId).toBe(ADMIN_MEDIA_ID);
      });
    });

    it('shows provenance without exposing raw owner ids', async () => {
      adminMockState.exercises = adminMockState.exercises.map((row) => ({
        ...row,
        createdByUserId: trainerA.id,
      }));
      renderAdmin(`/admin/exercises/${ADMIN_EXERCISE_ID}`);
      expect(await screen.findByText(copy.exercises.createdByOther, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByText(trainerA.id.slice(0, 8))).not.toBeInTheDocument();
    });

    it('requests archived exercises only when the Archived status is chosen', async () => {
      const user = userEvent.setup();
      renderAdmin('/admin/exercises');
      expect(await screen.findByRole('link', { name: 'Vital bench press' }, { timeout })).toBeInTheDocument();
      expect(adminMockState.lastExercisesStatusParam).toBeNull();
      await user.selectOptions(screen.getByLabelText(copy.common.status), 'ARCHIVED');
      await waitFor(() => expect(adminMockState.lastExercisesStatusParam).toBe('ARCHIVED'));
      expect(await screen.findByRole('heading', { name: copy.common.noMatchesTitle }, { timeout })).toBeInTheDocument();
    });

    it('shows a localized 409 on duplicate exercise create', async () => {
      const user = userEvent.setup();
      adminMockState.createExerciseStatus = 409;
      renderAdmin('/admin/exercises');
      await screen.findByRole('heading', { name: copy.exercises.title }, { timeout });
      await user.click(screen.getByRole('button', { name: copy.exercises.newExercise }));
      const dialog = await screen.findByRole('dialog', { name: copy.exercises.newExercise });
      await user.type(within(dialog).getByLabelText(copy.common.name), 'Vital bench press');
      await user.selectOptions(within(dialog).getByLabelText(copy.exercises.muscle), 'CHEST');
      await user.selectOptions(within(dialog).getByLabelText(copy.exercises.equipment), 'BARBELL');
      await user.click(within(dialog).getByRole('button', { name: copy.create }));
      expect(await within(dialog).findByText(copy.exercises.nameInUse, undefined, { timeout })).toBeInTheDocument();
      expect(screen.queryByText('Exercise name already exists')).not.toBeInTheDocument();
    });
  });

  describe('foods', () => {
    it('archives a food from the catalog', async () => {
      const user = userEvent.setup();
      renderAdmin(`/admin/foods/${ADMIN_FOOD_ID}`);
      expect(await screen.findByRole('heading', { name: 'Greek yogurt', level: 1 }, { timeout })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: copy.common.archive }));
      const confirm = await screen.findByRole('dialog', { name: copy.foods.archiveTitle });
      await user.click(within(confirm).getByRole('button', { name: copy.common.archive }));
      expect(await screen.findByText(copy.status.ARCHIVED, undefined, { timeout })).toBeInTheDocument();
    });

    it('shows truly empty catalog states without invented rows', async () => {
      useEmptyAdminCatalogs();
      renderAdmin('/admin/foods');
      expect(await screen.findByRole('heading', { name: copy.foods.emptyTitle }, { timeout })).toBeInTheDocument();
      expect(screen.getByText(copy.foods.emptyBody)).toBeInTheDocument();
      expect(screen.queryByText(copy.common.noMatchesTitle)).not.toBeInTheDocument();
    });

    it('renders Spanish Admin copy without English fallbacks', async () => {
      await changeAppLanguage('es');
      renderAdmin('/admin/foods');
      expect(await screen.findByRole('heading', { name: esAdminWorkspace.foods.title }, { timeout })).toBeInTheDocument();
      expect(screen.getAllByText(esAdminWorkspace.foods.newFood).length).toBeGreaterThan(0);
      expect(
        await screen.findByText(esAdminWorkspace.foods.per100Hint, { selector: 'p' }, { timeout }),
      ).toBeInTheDocument();
      expect(screen.queryByText(adminWorkspaceCopySource.foods.newFood)).not.toBeInTheDocument();
      expect(screen.queryByText(adminWorkspaceCopySource.foods.per100Hint)).not.toBeInTheDocument();
    });
  });

  describe('role boundaries', () => {
    it('keeps CLIENT out of admin routes', async () => {
      render(<TestApp initialEntry="/admin/dashboard" status="AUTHENTICATED" user={clientA} />);
      expect(await screen.findByRole('heading', { name: greetingHeadline(clientA.firstName) }, { timeout })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: copy.dashboard.title })).not.toBeInTheDocument();
    });

    it('keeps TRAINER out of admin routes', async () => {
      render(<TestApp initialEntry="/admin/trainers" status="AUTHENTICATED" user={trainerA} />);
      expect(await screen.findByRole('heading', { name: trainerWorkspaceCopy.dashboard.title }, { timeout })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: copy.trainers.title })).not.toBeInTheDocument();
    });
  });
});
