import { Link } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import type { ClientDashboardCheckInDto } from '@/generated/models';
import { ClientDashboardCheckInDtoStatus } from '@/generated/models';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  formatIsoDate,
  formatPlanDateRange,
} from '@/features/client-dashboard/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

export function CheckInSummaryCard({
  checkIn,
}: {
  checkIn: ClientDashboardCheckInDto | null | undefined;
}) {
  return (
    <DashboardCard aria-labelledby="check-in-summary-heading">
      <div className="flex items-start gap-2.5">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2
          id="check-in-summary-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {clientDashboardCopy.checkIn.title}
        </h2>
      </div>

      {checkIn ? <CheckInDetails checkIn={checkIn} /> : <EmptyCheckIn />}

      <Link
        to="/client/check-ins"
        className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 min-h-12 w-full')}
      >
        {clientDashboardCopy.checkIn.viewCheckIns}
      </Link>
    </DashboardCard>
  );
}

function EmptyCheckIn() {
  return (
    <div className="mt-3 space-y-1">
      <p className="text-sm font-medium text-foreground">
        {clientDashboardCopy.checkIn.emptyTitle}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {clientDashboardCopy.checkIn.emptyBody}
      </p>
    </div>
  );
}

function CheckInDetails({ checkIn }: { checkIn: ClientDashboardCheckInDto }) {
  const period = formatPlanDateRange(checkIn.periodStart, checkIn.periodEnd);
  const submitted = checkIn.submittedAt ? formatIsoDate(checkIn.submittedAt) : null;
  const reviewed = checkIn.reviewedAt ? formatIsoDate(checkIn.reviewedAt) : null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-sm font-medium text-foreground">{statusLabel(checkIn)}</p>
      {period ? (
        <p className="text-sm text-muted-foreground">
          {clientDashboardCopy.checkIn.period}: {period}
        </p>
      ) : null}
      {submitted ? (
        <p className="text-sm text-muted-foreground">
          {clientDashboardCopy.checkIn.submittedAt}: {submitted}
        </p>
      ) : null}
      {checkIn.hasReview && reviewed ? (
        <p className="text-sm text-muted-foreground">
          {clientDashboardCopy.checkIn.reviewedAt}: {reviewed}
        </p>
      ) : null}
    </div>
  );
}

function statusLabel(checkIn: ClientDashboardCheckInDto): string {
  if (checkIn.status === ClientDashboardCheckInDtoStatus.DRAFT) {
    return clientDashboardCopy.checkIn.draft;
  }
  if (checkIn.status === ClientDashboardCheckInDtoStatus.REVIEWED || checkIn.hasReview) {
    return clientDashboardCopy.checkIn.reviewed;
  }
  if (checkIn.status === ClientDashboardCheckInDtoStatus.SUBMITTED) {
    return checkIn.hasReview
      ? clientDashboardCopy.checkIn.reviewed
      : clientDashboardCopy.checkIn.waitingReview;
  }
  return clientDashboardCopy.checkIn.submitted;
}
