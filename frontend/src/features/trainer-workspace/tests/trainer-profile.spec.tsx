import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trainerA } from '@/features/auth/tests/fixtures';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { TestApp } from '@/features/auth/tests/render';
import { trainerCopy } from '@/features/navigation/copy';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { resetTrainerMockState } from '@/features/trainer-workspace/tests/msw-trainer';
import type { TrainerResponseDto } from '@/generated/models';
import { clearAccessToken } from '@/shared/lib/access-token';

const API = 'http://localhost:3000/api/v1';
const copy = trainerWorkspaceCopy.profile;
const timeout = 4000;

function trainerProfile(overrides: Partial<TrainerResponseDto> = {}): TrainerResponseDto {
  return {
    id: '5f0e1d2c-3b4a-4f5e-8d7c-6b5a4f3e2d1c',
    user: {
      id: trainerA.id,
      email: trainerA.email,
      firstName: trainerA.firstName,
      lastName: trainerA.lastName,
      role: 'TRAINER',
      status: 'ACTIVE',
    },
    phone: null,
    professionalTitle: 'Strength coach',
    bio: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  } as TrainerResponseDto;
}

function mockProfile(initial = trainerProfile()) {
  const state = { current: initial, patches: [] as unknown[] };
  authServer.use(
    http.get(`${API}/trainers/me`, () => HttpResponse.json(state.current)),
    http.patch(`${API}/trainers/me`, async ({ request }) => {
      const body = (await request.json()) as Record<string, string | null>;
      state.patches.push(body);
      state.current = trainerProfile({
        ...state.current,
        ...body,
        updatedAt: '2026-09-30T10:00:00.000Z',
      });
      return HttpResponse.json(state.current);
    }),
  );
  return state;
}

describe('Trainer profile', () => {
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

  it('is reachable from the sidebar and shows the read-only account', async () => {
    const user = userEvent.setup();
    mockProfile();
    render(<TestApp initialEntry="/trainer/dashboard" status="AUTHENTICATED" user={trainerA} />);

    const nav = await screen.findByRole('navigation', { name: 'Primary' }, { timeout });
    await user.click(within(nav).getByRole('link', { name: trainerCopy.profile.label }));

    expect(await screen.findByRole('heading', { name: copy.title, level: 1 }, { timeout })).toBeInTheDocument();
    expect(screen.getByText(trainerA.email)).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(copy.professionalTitle))).toHaveValue('Strength coach');
  });

  it('saves edits and clears emptied fields with null', async () => {
    const user = userEvent.setup();
    const state = mockProfile();
    render(<TestApp initialEntry="/trainer/profile" status="AUTHENTICATED" user={trainerA} />);

    const title = await screen.findByLabelText(new RegExp(copy.professionalTitle), undefined, { timeout });
    await user.clear(title);
    await user.type(screen.getByLabelText(new RegExp(copy.bio)), '  Coaching since 2015.  ');
    await user.type(screen.getByLabelText(new RegExp(copy.phone)), '+34 600 000 000');
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.save }));

    await waitFor(() =>
      expect(state.patches).toEqual([
        { phone: '+34 600 000 000', professionalTitle: null, bio: 'Coaching since 2015.' },
      ]),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(new RegExp(copy.bio))).toHaveValue('Coaching since 2015.'),
    );
    expect(screen.getByRole('button', { name: copy.reset })).toBeDisabled();
  });

  it('rejects a phone with letters before calling the API', async () => {
    const user = userEvent.setup();
    const state = mockProfile();
    render(<TestApp initialEntry="/trainer/profile" status="AUTHENTICATED" user={trainerA} />);

    await user.type(
      await screen.findByLabelText(new RegExp(copy.phone), undefined, { timeout }),
      'call me',
    );
    await user.click(screen.getByRole('button', { name: trainerWorkspaceCopy.save }));

    expect(await screen.findByText(copy.phoneInvalid)).toBeInTheDocument();
    expect(state.patches).toHaveLength(0);
  });
});
