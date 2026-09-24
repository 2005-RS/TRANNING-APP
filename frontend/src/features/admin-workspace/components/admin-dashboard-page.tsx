import type { ReactNode } from 'react';
import { ArrowRight, UserCog, Users } from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useAdminDashboardGetSystem } from '@/generated/admin-dashboard/admin-dashboard';
import { AdminDashboardGetSystemPeriodDays } from '@/generated/models';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import {
  AdminErrorState,
  AdminPageScaffold,
  AdminPageSkeleton,
  AdminSurface,
  NativeSelect,
} from '@/features/admin-workspace/components/admin-primitives';
import { formatNumber, interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

const STALE_TIME_MS = 60_000;

export function AdminDashboardPage() {
  const copy = useAdminWorkspaceCopy();
  const navigate = useNavigate({ from: '/admin/dashboard' });
  const search = useSearch({ from: '/admin/dashboard' });
  const query = useAdminDashboardGetSystem(
    { periodDays: search.periodDays },
    { query: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false, placeholderData: (previous) => previous } },
  );

  if (query.isPending) {
    return <AdminPageSkeleton label={copy.dashboard.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <AdminErrorState
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  const data = query.data;
  const assignedPct =
    data.activeClients > 0 ? Math.round((data.currentlyAssignedClients / data.activeClients) * 100) : 0;
  const hasUnassigned = data.unassignedActiveClients > 0;

  return (
    <AdminPageScaffold title={copy.dashboard.title} description={copy.dashboard.description}>
      <div className="grid gap-4 lg:grid-cols-12">
        <AdminSurface
          className={cn('lg:col-span-8', hasUnassigned && 'border-warning/50')}
          aria-labelledby="admin-coverage-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="admin-coverage-heading" className="text-lg font-semibold tracking-tight">
                {copy.dashboard.coverageTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.activeClients > 0
                  ? interpolate(copy.dashboard.coverageBody, {
                      assigned: formatNumber(data.currentlyAssignedClients),
                      active: formatNumber(data.activeClients),
                    })
                  : copy.dashboard.noActiveClients}
              </p>
            </div>
            {data.activeClients > 0 ? (
              <p className="font-mono text-4xl font-semibold tabular-nums">
                {formatNumber(assignedPct)}
                <span className="text-2xl text-muted-foreground">%</span>
              </p>
            ) : null}
          </div>
          {data.activeClients > 0 ? (
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-2 rounded-full bg-primary" style={{ width: `${assignedPct}%` }} />
            </div>
          ) : null}
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <Figure label={copy.dashboard.assignedClients} value={data.currentlyAssignedClients} />
            <Figure
              label={copy.dashboard.unassignedClients}
              value={data.unassignedActiveClients}
              emphasis={hasUnassigned}
            />
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {hasUnassigned ? (
              <Link to="/admin/assignments" className={cn(buttonVariants(), 'inline-flex')}>
                {copy.dashboard.reviewUnassigned}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : data.activeClients > 0 ? (
              <p className="text-sm text-muted-foreground">{copy.dashboard.allAssigned}</p>
            ) : (
              <Link to="/admin/clients" className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
                {copy.dashboard.manageClients}
              </Link>
            )}
          </div>
        </AdminSurface>

        <AdminSurface className="lg:col-span-4" aria-labelledby="admin-accounts-heading">
          <h2 id="admin-accounts-heading" className="text-lg font-semibold tracking-tight">
            {copy.dashboard.accountsTitle}
          </h2>
          <ul className="mt-4 divide-y divide-border">
            <AccountRow
              icon={<UserCog className="size-4" aria-hidden />}
              label={copy.dashboard.activeTrainers}
              value={data.activeTrainers}
              link={
                <Link to="/admin/trainers" className={accountLinkClassName}>
                  {copy.dashboard.manageTrainers}
                </Link>
              }
            />
            <AccountRow
              icon={<Users className="size-4" aria-hidden />}
              label={copy.dashboard.activeClients}
              value={data.activeClients}
              link={
                <Link to="/admin/clients" className={accountLinkClassName}>
                  {copy.dashboard.manageClients}
                </Link>
              }
            />
          </ul>
        </AdminSurface>

        <AdminSurface className="lg:col-span-12" aria-labelledby="admin-programs-heading">
          <h2 id="admin-programs-heading" className="text-lg font-semibold tracking-tight">
            {copy.dashboard.programsTitle}
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Figure label={copy.dashboard.activeTrainingPlans} value={data.activeTrainingPlans} />
            <Figure label={copy.dashboard.activeNutritionPlans} value={data.activeNutritionPlans} />
            <Figure
              label={interpolate(copy.dashboard.sessionsInWindow, { days: formatNumber(data.periodDays) })}
              value={data.completedWorkoutSessions}
              control={
                <label className="mt-3 block text-xs text-muted-foreground">
                  <span className="sr-only">{copy.dashboard.period}</span>
                  <NativeSelect
                    className="h-9 min-h-9"
                    value={String(data.periodDays)}
                    disabled={query.isFetching}
                    onChange={(event) => {
                      const raw = Number(event.target.value);
                      const periodDays =
                        raw === 7 || raw === 30 || raw === 90 ? (raw as AdminDashboardGetSystemPeriodDays) : undefined;
                      void navigate({ search: periodDays ? { periodDays } : {}, replace: true });
                    }}
                  >
                    <option value="7">{copy.dashboard.days7}</option>
                    <option value="30">{copy.dashboard.days30}</option>
                    <option value="90">{copy.dashboard.days90}</option>
                  </NativeSelect>
                </label>
              }
            />
            <Figure
              label={copy.dashboard.pendingCheckIns}
              value={data.pendingCheckIns}
              hint={copy.dashboard.pendingCheckInsHint}
            />
          </dl>
        </AdminSurface>
      </div>
    </AdminPageScaffold>
  );
}

const accountLinkClassName =
  'inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline';

function AccountRow({
  icon,
  label,
  value,
  link,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  link: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </p>
        {link}
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
    </li>
  );
}

function Figure({
  label,
  value,
  hint,
  emphasis = false,
  control,
}: {
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
  control?: ReactNode;
}) {
  return (
    <div className={cn('rounded-md border border-border bg-background/40 p-3', emphasis && 'border-warning/50')}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{formatNumber(value)}</dd>
      {hint ? <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</dd> : null}
      {control ? <dd>{control}</dd> : null}
    </div>
  );
}
