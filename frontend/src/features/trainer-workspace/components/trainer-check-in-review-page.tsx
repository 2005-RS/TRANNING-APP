import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckInResponseDtoStatus,
  type CreateCheckInReviewDto,
  type CreateCheckInReviewDtoActionItems,
} from '@/generated/models';
import { useCheckInsCreateReview, useCheckInsGetOne, useCheckInsUpdateReview } from '@/generated/check-ins/check-ins';
import {
  CHECK_IN_ADHERENCE_FIELDS,
  CHECK_IN_RATING_FIELDS,
  CHECK_IN_TEXT_FIELDS,
} from '@/features/client-check-ins/lib/fields';
import {
  formatAdherencePct,
  formatIsoDateTime,
  formatPeriodRange,
  formatRating,
} from '@/features/client-check-ins/lib/formatters';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { TextArea, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerCheckIns } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { checkInReviewSchema } from '@/features/trainer-workspace/schemas/check-in-review-schema';
import { useTrainerClientId, useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';

const copy = trainerWorkspaceCopy.checkIns;

export function TrainerCheckInReviewPage() {
  const clientId = useTrainerClientId();
  const checkInId = useTrainerRouteId('checkInId');
  const query = useCheckInsGetOne(clientId, checkInId, {
    query: {
      enabled: Boolean(clientId && checkInId),
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });

  if (query.isPending) {
    return (
      <WorkspaceSurface>
        <TrainerSectionSkeleton label={copy.loadingLabel} />
      </WorkspaceSurface>
    );
  }
  if (query.isError || !query.data || query.data.status === CheckInResponseDtoStatus.DRAFT) {
    return (
      <TrainerErrorState
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

  const checkIn = query.data;
  const ratings = CHECK_IN_RATING_FIELDS.flatMap((field) => {
    const value = formatRating(checkIn.responses[field]);
    return value ? [{ field, value }] : [];
  });
  const adherence = CHECK_IN_ADHERENCE_FIELDS.flatMap((field) => {
    const value = formatAdherencePct(checkIn.responses[field]);
    return value ? [{ field, value }] : [];
  });
  const notes = CHECK_IN_TEXT_FIELDS.flatMap((field) => {
    const text = checkIn.responses[field]?.trim();
    return text ? [{ field, text }] : [];
  });

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <WorkspaceSurface className="lg:col-span-7 space-y-4" aria-labelledby="checkin-responses-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="checkin-responses-heading" className="text-lg font-semibold tracking-tight">
              {formatPeriodRange(checkIn.periodStart, checkIn.periodEnd)}
            </h2>
            {checkIn.submittedAt ? (
              <p className="text-sm text-muted-foreground">{formatIsoDateTime(checkIn.submittedAt)}</p>
            ) : null}
          </div>
          <StatusBadge status={checkIn.status} />
        </div>
        {ratings.length === 0 && adherence.length === 0 && notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noResponses}</p>
        ) : (
          <div className="space-y-4">
            {ratings.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium">{copy.ratings}</h3>
                <dl className="mt-2 space-y-1">
                  {ratings.map((item) => (
                    <div key={item.field} className="flex justify-between gap-3 text-sm">
                      <dt className="text-muted-foreground">{copy.fields[item.field]}</dt>
                      <dd className="font-mono tabular-nums">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            {adherence.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium">{copy.adherence}</h3>
                <dl className="mt-2 space-y-1">
                  {adherence.map((item) => (
                    <div key={item.field} className="flex justify-between gap-3 text-sm">
                      <dt className="text-muted-foreground">{copy.fields[item.field]}</dt>
                      <dd className="font-mono tabular-nums">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            {notes.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium">{copy.notes}</h3>
                <dl className="mt-2 space-y-3">
                  {notes.map((item) => (
                    <div key={item.field}>
                      <dt className="text-sm text-muted-foreground">{copy.fields[item.field]}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm">{item.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        )}
      </WorkspaceSurface>
      <WorkspaceSurface className="lg:col-span-5" aria-labelledby="checkin-review-heading">
        <h2 id="checkin-review-heading" className="text-lg font-semibold tracking-tight">
          {checkIn.status === CheckInResponseDtoStatus.REVIEWED ? copy.reviewed : copy.review}
        </h2>
        <ReviewForm
          clientId={clientId}
          checkInId={checkInId}
          existingFeedback={checkIn.review?.feedback ?? ''}
          existingActionItems={checkIn.review?.actionItems ?? ''}
          mode={checkIn.status === CheckInResponseDtoStatus.REVIEWED ? 'update' : 'create'}
        />
      </WorkspaceSurface>
    </div>
  );
}

function ReviewForm({
  clientId,
  checkInId,
  existingFeedback,
  existingActionItems,
  mode,
}: {
  clientId: string;
  checkInId: string;
  existingFeedback: string;
  existingActionItems: string;
  mode: 'create' | 'update';
}) {
  const queryClient = useQueryClient();
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const createReview = useCheckInsCreateReview();
  const updateReview = useCheckInsUpdateReview();
  const form = useForm({
    defaultValues: {
      feedback: existingFeedback,
      actionItems: existingActionItems,
    },
    validators: { onSubmit: checkInReviewSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const payload: CreateCheckInReviewDto = {
        feedback: value.feedback.trim(),
        actionItems: value.actionItems?.trim()
          ? (value.actionItems.trim() as unknown as CreateCheckInReviewDtoActionItems)
          : null,
      };
      try {
        if (mode === 'create') {
          await createReview.mutateAsync({ clientId, checkInId, data: payload });
        } else {
          await updateReview.mutateAsync({ clientId, checkInId, data: payload });
        }
        await invalidateTrainerCheckIns(queryClient, clientId);
        toast.success(mode === 'create' ? copy.reviewed : copy.updateReview);
      } catch (error) {
        setFormError(mapApiError(error).description);
      }
    },
  });

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {formError ? (
        <Alert variant="danger" id={formErrorId}>
          {formError}
        </Alert>
      ) : null}
      <form.Field name="feedback">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="check-in-feedback">{copy.feedback}</Label>
            <TextArea
              id="check-in-feedback"
              name={field.name}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              maxLength={4000}
              required
            />
            {field.state.meta.errors.length > 0 ? (
              <p className="text-xs text-danger">{firstFieldError(field.state.meta.errors)}</p>
            ) : null}
          </div>
        )}
      </form.Field>
      <form.Field name="actionItems">
        {(field) => (
          <div className="space-y-1">
            <Label htmlFor="check-in-actions">{copy.actionItems}</Label>
            <TextArea
              id="check-in-actions"
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              maxLength={2000}
            />
          </div>
        )}
      </form.Field>
      <Button type="submit" disabled={form.state.isSubmitting}>
        {form.state.isSubmitting
          ? trainerWorkspaceCopy.saving
          : mode === 'create'
            ? copy.submitReview
            : copy.updateReview}
      </Button>
    </form>
  );
}
