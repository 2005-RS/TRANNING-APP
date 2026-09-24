import type { CheckInResponseDto } from '@/generated/models';
import { CheckInResponseDtoStatus } from '@/generated/models';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import {
  CHECK_IN_ADHERENCE_FIELDS,
  CHECK_IN_RATING_FIELDS,
  CHECK_IN_TEXT_FIELDS,
} from '@/features/client-check-ins/lib/fields';
import {
  formatAdherencePct,
  formatIsoDateTime,
  formatRating,
} from '@/features/client-check-ins/lib/formatters';
import { TrainerFeedback, WaitingForReview } from '@/features/client-check-ins/components/trainer-feedback';

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function CheckInReadOnly({ checkIn }: { checkIn: CheckInResponseDto }) {
  const submittedAt = checkIn.submittedAt ? formatIsoDateTime(checkIn.submittedAt) : null;
  const reviewed = checkIn.status === CheckInResponseDtoStatus.REVIEWED && checkIn.review;
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
  const hasResponses = ratings.length > 0 || adherence.length > 0 || notes.length > 0;

  return (
    <div className="space-y-5">
      {submittedAt ? (
        <p className="text-sm text-muted-foreground">
          {clientCheckInsCopy.readOnly.submittedAt}: {submittedAt}
        </p>
      ) : null}

      {hasResponses ? (
        <div className="client-surface-card client-surface-card--flush divide-y divide-border overflow-hidden">
          {ratings.length > 0 ? (
            <section className="space-y-3 p-5 sm:p-6" aria-labelledby="readonly-ratings-heading">
              <h2 id="readonly-ratings-heading" className="text-base font-semibold tracking-tight">
                {clientCheckInsCopy.readOnly.ratingsTitle}
              </h2>
              <dl className="space-y-2">
                {ratings.map((item) => (
                  <ValueRow
                    key={item.field}
                    label={clientCheckInsCopy.form[item.field]}
                    value={item.value}
                  />
                ))}
              </dl>
            </section>
          ) : null}

          {adherence.length > 0 ? (
            <section className="space-y-3 p-5 sm:p-6" aria-labelledby="readonly-adherence-heading">
              <h2 id="readonly-adherence-heading" className="text-base font-semibold tracking-tight">
                {clientCheckInsCopy.readOnly.adherenceTitle}
              </h2>
              <dl className="space-y-2">
                {adherence.map((item) => (
                  <ValueRow
                    key={item.field}
                    label={clientCheckInsCopy.form[item.field]}
                    value={item.value}
                  />
                ))}
              </dl>
            </section>
          ) : null}

          {notes.length > 0 ? (
            <section className="space-y-4 p-5 sm:p-6" aria-labelledby="readonly-notes-heading">
              <h2 id="readonly-notes-heading" className="text-base font-semibold tracking-tight">
                {clientCheckInsCopy.readOnly.notesTitle}
              </h2>
              {notes.map((item) => (
                <div key={item.field} className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">
                    {clientCheckInsCopy.form[item.field]}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      {reviewed ? (
        <TrainerFeedback review={reviewed} />
      ) : checkIn.status === CheckInResponseDtoStatus.SUBMITTED ? (
        <WaitingForReview />
      ) : null}
    </div>
  );
}
