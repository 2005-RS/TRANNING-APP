import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Outlet } from '@tanstack/react-router';
import { RequireAuth } from '@/features/auth/components/auth-gates';
import { AuthUserResponseDtoRole } from '@/generated/models';
import { ContentSkeleton } from '@/shared/ui/page';

const ClientAppShell = lazy(() =>
  import('@/app/shells/client-app-shell').then((module) => ({
    default: module.ClientAppShell,
  })),
);

const TrainerAppShell = lazy(() =>
  import('@/app/shells/trainer-app-shell').then((module) => ({
    default: module.TrainerAppShell,
  })),
);

const AdminAppShell = lazy(() =>
  import('@/app/shells/admin-app-shell').then((module) => ({
    default: module.AdminAppShell,
  })),
);

function RoleShellFrame({
  role,
  shell: Shell,
}: {
  role: (typeof AuthUserResponseDtoRole)[keyof typeof AuthUserResponseDtoRole];
  shell: ComponentType<{ children: ReactNode }>;
}) {
  return (
    <RequireAuth role={role}>
      <Suspense fallback={<ContentSkeleton />}>
        <Shell>
          <Outlet />
        </Shell>
      </Suspense>
    </RequireAuth>
  );
}

export function ClientRoleLayout() {
  return (
    <RoleShellFrame role={AuthUserResponseDtoRole.CLIENT} shell={ClientAppShell} />
  );
}

export function TrainerRoleLayout() {
  return (
    <RoleShellFrame role={AuthUserResponseDtoRole.TRAINER} shell={TrainerAppShell} />
  );
}

export function AdminRoleLayout() {
  return (
    <RoleShellFrame role={AuthUserResponseDtoRole.ADMIN} shell={AdminAppShell} />
  );
}
