import { Link, useRouterState } from '@tanstack/react-router';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { cn } from '@/shared/lib/utils';

const TAB_DEFS = [
  { to: '/trainer/clients/$clientId', key: 'overview', end: true },
  { to: '/trainer/clients/$clientId/training', key: 'training' },
  { to: '/trainer/clients/$clientId/progress', key: 'progress' },
  { to: '/trainer/clients/$clientId/body', key: 'body' },
  { to: '/trainer/clients/$clientId/nutrition', key: 'nutrition' },
  { to: '/trainer/clients/$clientId/check-ins', key: 'checkIns' },
] as const;

export function ClientWorkspaceNav({ clientId }: { clientId: string }) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const base = `/trainer/clients/${clientId}`;
  const workspace = trainerWorkspaceCopy.workspace;

  return (
    <nav aria-label={workspace.contextLabel} className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1">
        {TAB_DEFS.map((tab) => {
          const href =
            tab.to === '/trainer/clients/$clientId'
              ? base
              : tab.to.replace('$clientId', clientId);
          const exact = 'end' in tab && tab.end === true;
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                params={{ clientId }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md px-3 text-sm',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {workspace[tab.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
