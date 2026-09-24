import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LoginForm } from '@/features/auth/components/login-form';
import { TestProviders } from '@/features/auth/tests/render';
import { authCopy, useAuthCopy } from '@/features/auth/copy';
import { clientCopy, navigationCopy, useClientNavCopy, useTrainerNavCopy } from '@/features/navigation/copy';
import { getAdminNav, getClientPrimaryNav, getTrainerNav } from '@/features/navigation/nav-config';
import { trainerWorkspaceCopy, useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { useLanguage } from '@/i18n/use-language';
import { LANGUAGE_STORAGE_KEY } from '@/i18n/constants';
import { changeAppLanguage } from '@/i18n/language';
import { getLoginFormSchema } from '@/features/auth/schemas/login-schema';
import { getTemplateSchema } from '@/features/trainer-workspace/schemas/plan-schemas';
import { WorkoutTemplateResponseDtoStatus } from '@/generated/models';

function RoleNavProbe({ role }: { role: 'client' | 'trainer' | 'admin' }) {
  useLanguage();
  const items =
    role === 'client' ? getClientPrimaryNav() : role === 'trainer' ? getTrainerNav() : getAdminNav();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.to}>{item.label}</li>
      ))}
    </ul>
  );
}

function AuthCopyProbe() {
  const authCopy = useAuthCopy();
  const clientCopy = useClientNavCopy();
  return (
    <>
      <p>{authCopy.login.title}</p>
      <p>{clientCopy.training.label}</p>
    </>
  );
}

function TrainerCopyProbe() {
  const trainerCopy = useTrainerNavCopy();
  return <p>{trainerCopy.dashboard.label}</p>;
}

function UserNameProbe({ name }: { name: string }) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  return (
    <>
      <p>{name}</p>
      <p>{trainerWorkspaceCopy.templates.create}</p>
    </>
  );
}

afterEach(async () => {
  await changeAppLanguage('en');
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
});

describe('internationalization', () => {
  it('defaults to English and English html lang', () => {
    render(
      <TestProviders>
        <LanguageSwitcher />
      </TestProviders>,
    );
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('language-switcher')).toHaveAccessibleName('Language, English');
    expect(authCopy.login.title).toBe('Sign in');
    expect(clientCopy.home.label).toBe('Home');
  });

  it('switches visible copy to Spanish immediately without a reload', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <LanguageSwitcher />
        <AuthCopyProbe />
      </TestProviders>,
    );

    await user.click(screen.getByTestId('language-switcher'));
    await user.click(screen.getByRole('menuitemradio', { name: 'Español' }));

    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.getByText('Entrenamiento')).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('persists Spanish after remount', async () => {
    await changeAppLanguage('es');
    const { unmount } = render(
      <TestProviders>
        <p>{navigationCopy.roles.TRAINER}</p>
      </TestProviders>,
    );
    expect(screen.getByText('Entrenador')).toBeInTheDocument();
    unmount();
    render(
      <TestProviders>
        <p>{navigationCopy.roles.TRAINER}</p>
      </TestProviders>,
    );
    expect(screen.getByText('Entrenador')).toBeInTheDocument();
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('switches Spanish back to English immediately', async () => {
    const user = userEvent.setup();
    await changeAppLanguage('es');
    render(
      <TestProviders>
        <LanguageSwitcher />
        <TrainerCopyProbe />
      </TestProviders>,
    );
    expect(screen.getByText('Panel principal')).toBeInTheDocument();
    await user.click(screen.getByTestId('language-switcher'));
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('maps backend enums at the presentation layer only', () => {
    expect(WorkoutTemplateResponseDtoStatus.DRAFT).toBe('DRAFT');
    expect(WorkoutTemplateResponseDtoStatus.ACTIVE).toBe('ACTIVE');
    expect(WorkoutTemplateResponseDtoStatus.ARCHIVED).toBe('ARCHIVED');
    expect(trainerWorkspaceCopy.status.DRAFT).toBe('Draft');
    void changeAppLanguage('es');
    expect(trainerWorkspaceCopy.status.DRAFT).toBe('Borrador');
    expect(trainerWorkspaceCopy.status.SUBMITTED).toBe('En espera de revisión');
    expect(WorkoutTemplateResponseDtoStatus.DRAFT).toBe('DRAFT');
  });

  it('does not translate user-generated names', async () => {
    await changeAppLanguage('es');
    const userName = 'Upper Body Strength';
    render(
      <TestProviders>
        <UserNameProbe name={userName} />
      </TestProviders>,
    );
    expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
    expect(screen.getByText('Nueva plantilla')).toBeInTheDocument();
  });

  it('translates login and validation messages', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TestProviders>
        <LoginForm onLogin={async () => undefined} />
      </TestProviders>,
    );
    expect(screen.getByRole('button', { name: authCopy.login.submit })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: authCopy.login.submit }));
    expect(await screen.findByText(authCopy.validation.emailRequired)).toBeInTheDocument();

    await changeAppLanguage('es');
    rerender(
      <TestProviders>
        <LoginForm onLogin={async () => undefined} />
      </TestProviders>,
    );
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa tu correo electrónico')).toBeInTheDocument();
    expect(getLoginFormSchema().safeParse({ email: '', password: '' }).error?.issues[0]?.message).toBe(
      'Ingresa tu correo electrónico',
    );
    expect(getTemplateSchema().safeParse({ name: '', description: '' }).error?.issues[0]?.message).toBe(
      'El nombre de la plantilla es obligatorio.',
    );
  });

  it('translates role navigation labels', async () => {
    const { rerender } = render(
      <TestProviders>
        <RoleNavProbe role="client" />
      </TestProviders>,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    await changeAppLanguage('es');
    rerender(
      <TestProviders>
        <RoleNavProbe role="client" />
      </TestProviders>,
    );
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Entrenamiento')).toBeInTheDocument();
  });

  it('translates trainer and admin navigation labels', async () => {
    await changeAppLanguage('es');
    render(
      <TestProviders>
        <RoleNavProbe role="trainer" />
        <RoleNavProbe role="admin" />
      </TestProviders>,
    );
    expect(screen.getAllByText('Panel principal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0);
    expect(screen.getByText('Entrenadores')).toBeInTheDocument();
    expect(screen.getByText('Asignaciones')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
  });
});
