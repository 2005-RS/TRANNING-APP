import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'motion/react';
import type { UpdateCheckInDto } from '@/generated/models';
import { CheckInResponseDtoStatus, UpdateCheckInStatusDtoStatus } from '@/generated/models';
import { CheckInDetailSkeleton } from '@/features/client-check-ins/components/check-ins-skeleton';
import { CheckInsError } from '@/features/client-check-ins/components/check-ins-error';
import { CheckInForm } from '@/features/client-check-ins/components/check-in-form';
import { CheckInReadOnly } from '@/features/client-check-ins/components/check-in-read-only';
import { CheckInStatusBadge } from '@/features/client-check-ins/components/check-in-status-badge';
import { ConfirmSheet } from '@/features/client-check-ins/components/confirm-sheet';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import {
  useClientCheckInDetail,
  useClientCheckInMutations,
} from '@/features/client-check-ins/hooks/use-client-check-ins';
import { formatPeriodRange } from '@/features/client-check-ins/lib/formatters';
import { isWritableCheckInStatus } from '@/features/client-check-ins/lib/status';
import { Button } from '@/shared/ui/button';
import { PageContainer, PageHeader, PageTitle } from '@/shared/ui/page';

export function ClientCheckInDetailPage() {
  const { checkInId } = useParams({ from: '/client/check-ins/$checkInId' });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [discardOpen, setDiscardOpen] = useState(false);
  const detailQuery = useClientCheckInDetail(checkInId);
  const { update, updateStatus, remove } = useClientCheckInMutations();
  const checkIn = detailQuery.data;
  const pending = update.isPending || updateStatus.isPending || remove.isPending;

  async function onSave(data: UpdateCheckInDto) {
    await update.mutateAsync({ checkInId, data });
    toast.success(clientCheckInsCopy.form.saved);
  }

  async function onSubmit(data: UpdateCheckInDto) {
    await update.mutateAsync({ checkInId, data });
    await updateStatus.mutateAsync({
      checkInId,
      data: { status: UpdateCheckInStatusDtoStatus.SUBMITTED },
    });
    toast.success(clientCheckInsCopy.form.submitted);
  }

  async function onDiscard() {
    await remove.mutateAsync({ checkInId });
    setDiscardOpen(false);
    toast.success(clientCheckInsCopy.discard.discarded);
    await navigate({ to: '/client/check-ins' });
  }

  const writable = checkIn ? isWritableCheckInStatus(checkIn.status) : false;
  const period = checkIn ? formatPeriodRange(checkIn.periodStart, checkIn.periodEnd) : null;
  const loading = detailQuery.isPending;
  const detailError = detailQuery.isError;
  const retrying = detailQuery.isFetching;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <PageHeader className="mb-6">
        <div className="space-y-3">
          <Link
            to="/client/check-ins"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {clientCheckInsCopy.back}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <PageTitle>{period ?? clientCheckInsCopy.detailTitle}</PageTitle>
            {checkIn ? (
              <CheckInStatusBadge
                status={checkIn.status}
                hasReview={checkIn.status === CheckInResponseDtoStatus.REVIEWED}
              />
            ) : null}
          </div>
        </div>
      </PageHeader>

      {loading ? (
        <CheckInDetailSkeleton />
      ) : detailError ? (
        <CheckInsError
          error={detailQuery.error as unknown}
          retrying={retrying}
          onRetry={() => {
            void detailQuery.refetch();
          }}
        />
      ) : checkIn ? (
        <div className="space-y-6">
          {writable ? (
            <>
              <CheckInForm
                key={checkIn.id}
                checkIn={checkIn}
                pending={pending}
                onSave={onSave}
                onSubmit={onSubmit}
              />
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 w-full text-muted-foreground"
                disabled={pending}
                onClick={() => setDiscardOpen(true)}
              >
                {clientCheckInsCopy.form.discard}
              </Button>
            </>
          ) : (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
            >
              <CheckInReadOnly checkIn={checkIn} />
            </motion.div>
          )}
        </div>
      ) : null}

      <ConfirmSheet
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={clientCheckInsCopy.discard.title}
        description={clientCheckInsCopy.discard.description}
        confirmLabel={clientCheckInsCopy.discard.confirm}
        cancelLabel={clientCheckInsCopy.discard.cancel}
        pending={remove.isPending}
        danger
        onConfirm={() => {
          void onDiscard();
        }}
      />
    </PageContainer>
  );
}
