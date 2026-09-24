import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/login-form';
import { authCopy } from '@/features/auth/copy';
import { TestProviders } from '@/features/auth/tests/render';
import { ApiError } from '@/shared/errors/api-error';

function renderForm(
  onLogin: (values: { email: string; password: string }) => Promise<void> = vi
    .fn()
    .mockResolvedValue(undefined),
) {
  return {
    onLogin,
    user: userEvent.setup(),
    ...render(
      <TestProviders>
        <LoginForm onLogin={onLogin} />
      </TestProviders>,
    ),
  };
}

describe('LoginForm', () => {
  it('renders labelled email and password fields', () => {
    renderForm();
    expect(screen.getByLabelText(authCopy.login.emailLabel)).toBeInTheDocument();
    expect(
      screen.getByLabelText(authCopy.login.passwordLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: authCopy.login.submit }),
    ).toBeEnabled();
  });

  it('validates email format and required password', async () => {
    const { user, onLogin } = renderForm();
    await user.type(screen.getByLabelText(authCopy.login.emailLabel), 'not-an-email');
    await user.click(screen.getByRole('button', { name: authCopy.login.submit }));

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.passwordRequired)).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('toggles password visibility without changing the value', async () => {
    const { user } = renderForm();
    const password = screen.getByLabelText(authCopy.login.passwordLabel);
    await user.type(password, 'secret-pass');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: authCopy.login.showPassword }),
    );
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('secret-pass');

    await user.click(
      screen.getByRole('button', { name: authCopy.login.hidePassword }),
    );
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('secret-pass');
  });

  it('disables submit while login is in flight', async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { user } = renderForm(() => pending);

    await user.type(
      screen.getByLabelText(authCopy.login.emailLabel),
      'client.a@example.test',
    );
    await user.type(
      screen.getByLabelText(authCopy.login.passwordLabel),
      'any-password',
    );
    await user.click(screen.getByRole('button', { name: authCopy.login.submit }));

    expect(
      await screen.findByRole('button', { name: new RegExp(authCopy.login.submitting) }),
    ).toBeDisabled();
    release?.();
  });

  it('calls the session login flow on success', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    const { user } = renderForm(onLogin);

    await user.type(
      screen.getByLabelText(authCopy.login.emailLabel),
      'client.a@example.test',
    );
    await user.type(
      screen.getByLabelText(authCopy.login.passwordLabel),
      'any-password',
    );
    await user.click(screen.getByRole('button', { name: authCopy.login.submit }));

    await vi.waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        email: 'client.a@example.test',
        password: 'any-password',
      });
    });
  });

  it('shows a generic invalid-credentials message without leaking account existence', async () => {
    const onLogin = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'No user for this email',
        path: '/api/v1/auth/login',
        timestamp: '2026-09-04T00:00:00.000Z',
        requestId: 'req-login',
      }),
    );
    const { user } = renderForm(onLogin);

    await user.type(
      screen.getByLabelText(authCopy.login.emailLabel),
      'unknown@example.test',
    );
    await user.type(
      screen.getByLabelText(authCopy.login.passwordLabel),
      'any-password',
    );
    await user.click(screen.getByRole('button', { name: authCopy.login.submit }));

    expect(
      await screen.findByText(authCopy.errors.invalidCredentials),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No user for this email/)).not.toBeInTheDocument();
  });
});
