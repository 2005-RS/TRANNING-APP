import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '@/features/auth/components/register-form';
import { authCopy } from '@/features/auth/copy';
import type { RegisterFormValues } from '@/features/auth/schemas/register-schema';
import { TestProviders } from '@/features/auth/tests/render';
import { ApiError } from '@/shared/errors/api-error';

type OnRegister = (values: RegisterFormValues) => Promise<void>;

async function renderForm(onRegister: OnRegister = vi.fn().mockResolvedValue(undefined)) {
  const rootRoute = createRootRoute();
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <RegisterForm onRegister={onRegister} />,
  });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([registerRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  const result = render(
    <TestProviders>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  // The router resolves the initial match asynchronously.
  await screen.findByRole('button', { name: authCopy.register.submit });

  return {
    onRegister,
    user: userEvent.setup(),
    ...result,
  };
}

async function completeValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(authCopy.register.firstNameLabel), 'Ada');
  await user.type(screen.getByLabelText(authCopy.register.lastNameLabel), 'Client');
  await user.type(screen.getByLabelText(authCopy.login.emailLabel), 'ada@example.test');
  await user.type(screen.getByLabelText(authCopy.login.passwordLabel), 'a-strong-password');
  await user.selectOptions(screen.getByLabelText(authCopy.register.primaryGoalLabel), 'GENERAL_FITNESS');
  await user.selectOptions(screen.getByLabelText(authCopy.register.experienceLevelLabel), 'BEGINNER');
  await user.click(screen.getByLabelText(authCopy.register.acceptTerms));
}

describe('RegisterForm', () => {
  it('shows required errors and focuses the first invalid field', async () => {
    const { onRegister, user } = await renderForm();

    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.validation.firstNameRequired)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.lastNameRequired)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.emailRequired)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.passwordLength)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.primaryGoalRequired)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.experienceLevelRequired)).toBeInTheDocument();
    expect(screen.getByText(authCopy.validation.termsRequired)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(authCopy.register.firstNameLabel)).toHaveFocus();
    });
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('requires accepting the terms', async () => {
    const { onRegister, user } = await renderForm();

    await user.type(screen.getByLabelText(authCopy.register.firstNameLabel), 'Ada');
    await user.type(screen.getByLabelText(authCopy.register.lastNameLabel), 'Client');
    await user.type(screen.getByLabelText(authCopy.login.emailLabel), 'ada@example.test');
    await user.type(screen.getByLabelText(authCopy.login.passwordLabel), 'a-strong-password');
    await user.selectOptions(screen.getByLabelText(authCopy.register.primaryGoalLabel), 'GENERAL_FITNESS');
    await user.selectOptions(screen.getByLabelText(authCopy.register.experienceLevelLabel), 'BEGINNER');
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.validation.termsRequired)).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than the policy minimum', async () => {
    const { onRegister, user } = await renderForm();

    await completeValidForm(user);
    await user.clear(screen.getByLabelText(authCopy.login.passwordLabel));
    await user.type(screen.getByLabelText(authCopy.login.passwordLabel), 'short');
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.validation.passwordLength)).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('shows a duplicate-email message with a sign-in link', async () => {
    const onRegister = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Account already exists',
        path: '/api/v1/auth/register',
        timestamp: '2026-10-10T00:00:00.000Z',
        requestId: 'req-register-conflict',
      }),
    );
    const { user } = await renderForm(onRegister);

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.errors.duplicateEmail)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: authCopy.signUp.signInLink })).toHaveAttribute('href', '/login');
  });

  it('shows the rate-limit message', async () => {
    const onRegister = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
        path: '/api/v1/auth/register',
        timestamp: '2026-10-10T00:00:00.000Z',
        requestId: 'req-register-rate-limit',
      }),
    );
    const { user } = await renderForm(onRegister);

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.errors.registerRateLimited)).toBeInTheDocument();
  });

  it('does not expose a backend validation message', async () => {
    const onRegister = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Internal validation detail',
        path: '/api/v1/auth/register',
        timestamp: '2026-10-10T00:00:00.000Z',
        requestId: 'req-register-invalid',
      }),
    );
    const { user } = await renderForm(onRegister);

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    expect(await screen.findByText(authCopy.errors.registerInvalid)).toBeInTheDocument();
    expect(screen.queryByText('Internal validation detail')).not.toBeInTheDocument();
  });

  it('submits exactly the registration DTO fields', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    const { user } = await renderForm(onRegister);

    await completeValidForm(user);
    await user.click(screen.getByRole('button', { name: authCopy.register.submit }));

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Client',
        email: 'ada@example.test',
        password: 'a-strong-password',
        primaryGoal: 'GENERAL_FITNESS',
        experienceLevel: 'BEGINNER',
        acceptTerms: true,
      });
    });
  });
});
