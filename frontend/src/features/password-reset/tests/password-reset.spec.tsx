import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authCopy } from '@/features/auth/copy';
import { resetAuthBootstrap } from '@/features/auth/lib/session-service';
import { authServer, resetAuthMockState } from '@/features/auth/tests/msw-server';
import { TestApp } from '@/features/auth/tests/render';
import { passwordResetCopy } from '@/features/password-reset/copy';
import { readResetToken } from '@/features/password-reset/lib/reset-token';
import { clearAccessToken } from '@/shared/lib/access-token';

const API = 'http://localhost:3000/api/v1/auth';
const VALID_TOKEN = `0b6f3d2e-5c1a-4f7e-9a3b-2d4c6e8f0a1b.${'A'.repeat(43)}`;

function errorBody(statusCode: number, message: string) {
  return {
    statusCode,
    code: statusCode === 429 ? 'TOO_MANY_REQUESTS' : 'BAD_REQUEST',
    message,
    path: '/api/v1/auth/reset-password',
    timestamp: new Date().toISOString(),
    requestId: 'req-test',
  };
}

describe('password reset', () => {
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

  it('links from sign in to the forgot-password page', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry="/login" />);

    await user.click(
      await screen.findByRole('link', { name: passwordResetCopy.forgotLink }, { timeout: 4000 }),
    );

    expect(
      await screen.findByRole('heading', { name: passwordResetCopy.forgot.title }),
    ).toBeInTheDocument();
  });

  it('validates the email before calling the API', async () => {
    const user = userEvent.setup();
    let calls = 0;
    authServer.use(
      http.post(`${API}/forgot-password`, () => {
        calls += 1;
        return new HttpResponse(null, { status: 202 });
      }),
    );
    render(<TestApp initialEntry="/forgot-password" />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.forgot.emailLabel, undefined, { timeout: 4000 }),
      'not-an-email',
    );
    await user.click(screen.getByRole('button', { name: passwordResetCopy.forgot.submit }));

    expect(await screen.findByText(passwordResetCopy.validation.emailInvalid)).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('shows the same neutral confirmation whatever the account state', async () => {
    const user = userEvent.setup();
    let sentEmail: unknown;
    authServer.use(
      http.post(`${API}/forgot-password`, async ({ request }) => {
        sentEmail = ((await request.json()) as { email: string }).email;
        return new HttpResponse(null, { status: 202 });
      }),
    );
    render(<TestApp initialEntry="/forgot-password" />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.forgot.emailLabel, undefined, { timeout: 4000 }),
      '  someone@example.com ',
    );
    await user.click(screen.getByRole('button', { name: passwordResetCopy.forgot.submit }));

    expect(
      await screen.findByRole('heading', { name: passwordResetCopy.forgot.sentTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(passwordResetCopy.forgot.sentBody('someone@example.com'))).toBeInTheDocument();
    expect(sentEmail).toBe('someone@example.com');
  });

  it('explains rate limiting on the forgot-password form', async () => {
    const user = userEvent.setup();
    authServer.use(
      http.post(`${API}/forgot-password`, () =>
        HttpResponse.json(errorBody(429, 'Too many requests'), { status: 429 }),
      ),
    );
    render(<TestApp initialEntry="/forgot-password" />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.forgot.emailLabel, undefined, { timeout: 4000 }),
      'someone@example.com',
    );
    await user.click(screen.getByRole('button', { name: passwordResetCopy.forgot.submit }));

    expect(await screen.findByText(passwordResetCopy.errors.rateLimited)).toBeInTheDocument();
  });

  it('shows the invalid-link state when the URL has no token', async () => {
    render(<TestApp initialEntry="/reset-password" />);

    expect(
      await screen.findByRole('heading', { name: passwordResetCopy.reset.invalidTitle }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: passwordResetCopy.reset.requestNew }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('checks length and confirmation before submitting a new password', async () => {
    const user = userEvent.setup();
    render(<TestApp initialEntry={`/reset-password#token=${VALID_TOKEN}`} />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.reset.passwordLabel, undefined, { timeout: 4000 }),
      'short',
    );
    await user.type(screen.getByLabelText(passwordResetCopy.reset.confirmLabel), 'different');
    await user.click(screen.getByRole('button', { name: passwordResetCopy.reset.submit }));

    expect(await screen.findByText(passwordResetCopy.validation.passwordLength)).toBeInTheDocument();
    expect(screen.getByText(passwordResetCopy.validation.passwordMismatch)).toBeInTheDocument();
  });

  it('sends the token from the fragment and confirms the new password', async () => {
    const user = userEvent.setup();
    let body: unknown;
    authServer.use(
      http.post(`${API}/reset-password`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<TestApp initialEntry={`/reset-password#token=${VALID_TOKEN}`} />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.reset.passwordLabel, undefined, { timeout: 4000 }),
      'a-new-long-password',
    );
    await user.type(screen.getByLabelText(passwordResetCopy.reset.confirmLabel), 'a-new-long-password');
    await user.click(screen.getByRole('button', { name: passwordResetCopy.reset.submit }));

    expect(
      await screen.findByRole('heading', { name: passwordResetCopy.reset.doneTitle }),
    ).toBeInTheDocument();
    expect(body).toEqual({ token: VALID_TOKEN, password: 'a-new-long-password' });

    await user.click(screen.getByRole('link', { name: passwordResetCopy.reset.signIn }));
    expect(
      await screen.findByRole('heading', { name: authCopy.login.title }),
    ).toBeInTheDocument();
  });

  it('switches to the invalid-link state when the API rejects the token', async () => {
    const user = userEvent.setup();
    authServer.use(
      http.post(`${API}/reset-password`, () =>
        HttpResponse.json(errorBody(400, 'This reset link is invalid or has expired'), {
          status: 400,
        }),
      ),
    );
    render(<TestApp initialEntry={`/reset-password#token=${VALID_TOKEN}`} />);

    await user.type(
      await screen.findByLabelText(passwordResetCopy.reset.passwordLabel, undefined, { timeout: 4000 }),
      'a-new-long-password',
    );
    await user.type(screen.getByLabelText(passwordResetCopy.reset.confirmLabel), 'a-new-long-password');
    await user.click(screen.getByRole('button', { name: passwordResetCopy.reset.submit }));

    expect(
      await screen.findByRole('heading', { name: passwordResetCopy.reset.invalidTitle }),
    ).toBeInTheDocument();
  });
});

describe('readResetToken', () => {
  it('accepts only the id.secret shape from the fragment', () => {
    expect(readResetToken(`#token=${VALID_TOKEN}`)).toBe(VALID_TOKEN);
    expect(readResetToken(`token=${VALID_TOKEN}`)).toBe(VALID_TOKEN);
    expect(readResetToken('#token=abc')).toBeNull();
    expect(readResetToken('')).toBeNull();
  });
});
