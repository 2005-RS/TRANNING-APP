import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { CheckInSummaryResponseDto } from '@/generated/models';
import { CheckInResponseDtoStatus } from '@/generated/models';
import { CheckInStatusBadge } from '@/features/client-check-ins/components/check-in-status-badge';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { formatPeriodRange } from '@/features/client-check-ins/lib/formatters';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

export function CurrentCheckInCard({ checkIn }: { checkIn: CheckInSummaryResponseDto }) {
  const reduceMotion = useReducedMotion();
  const period = formatPeriodRange(checkIn.periodStart, checkIn.periodEnd);
  const isDraft = checkIn.status === CheckInResponseDtoStatus.DRAFT;
  const cta = isDraft
    ? clientCheckInsCopy.current.continue
    : checkIn.status === CheckInResponseDtoStatus.REVIEWED || checkIn.hasReview
      ? clientCheckInsCopy.current.viewFeedback
      : clientCheckInsCopy.current.view;

  return (
    <motion.section
      className={cn(
        'client-surface-card space-y-4',
        isDraft && 'dashboard-hero-card dashboard-hero-card--action',
      )}
      aria-labelledby="current-check-in-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{clientCheckInsCopy.current.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="current-check-in-heading" className="text-lg font-semibold tracking-tight">
            {period ?? clientCheckInsCopy.detailTitle}
          </h2>
          <CheckInStatusBadge status={checkIn.status} hasReview={checkIn.hasReview} />
        </div>
      </div>
      <Link
        to="/client/check-ins/$checkInId"
        params={{ checkInId: checkIn.id }}
        className={cn(buttonVariants({ size: isDraft ? 'lg' : 'default' }), 'min-h-14 w-full')}
      >
        {cta}
      </Link>
    </motion.section>
  );
}

export function CheckInHistoryList({
  items,
  page,
  totalPages,
  onPageChange,
}: {
  items: CheckInSummaryResponseDto[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby="check-in-history-heading">
      <h2 id="check-in-history-heading" className="px-1 text-base font-semibold tracking-tight">
        {clientCheckInsCopy.history.title}
      </h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const period = formatPeriodRange(item.periodStart, item.periodEnd);
          return (
            <li key={item.id}>
              <Link
                to="/client/check-ins/$checkInId"
                params={{ checkInId: item.id }}
                className="client-surface-card flex min-h-14 items-center justify-between gap-3 overflow-hidden no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {period ?? clientCheckInsCopy.detailTitle}
                  </p>
                  <CheckInStatusBadge status={item.status} hasReview={item.hasReview} />
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-12')}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {clientCheckInsCopy.history.previous}
          </button>
          <p className="text-sm text-muted-foreground">
            {clientCheckInsCopy.history.page} {page}
          </p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-12')}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {clientCheckInsCopy.history.next}
          </button>
        </div>
      ) : null}
    </section>
  );
}
