import { useId, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert } from 'lucide-react';
import type { CheckInResponseDto, UpdateCheckInDto } from '@/generated/models';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { RatingScale } from '@/features/client-check-ins/components/rating-scale';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import {
  CHECK_IN_ADHERENCE_FIELDS,
  CHECK_IN_RATING_FIELDS,
  CHECK_IN_TEXT_FIELDS,
  CHECK_IN_TEXT_MAX_LENGTH,
} from '@/features/client-check-ins/lib/fields';
import { mapCheckInError } from '@/features/client-check-ins/lib/map-error';
import {
  checkInToFormValues,
  formValuesToUpdatePayload,
  hasSubstantiveResponse,
} from '@/features/client-check-ins/lib/payload';
import { getCheckInFormSchema } from '@/features/client-check-ins/schemas/check-in-form-schema';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

type SubmitIntent = 'save' | 'submit';

export function CheckInForm({
  checkIn,
  onSave,
  onSubmit,
  pending,
}: {
  checkIn: CheckInResponseDto;
  onSave: (data: UpdateCheckInDto) => Promise<void>;
  onSubmit: (data: UpdateCheckInDto) => Promise<void>;
  pending: boolean;
}) {
  const formErrorId = useId();
  const intentRef = useRef<SubmitIntent>('save');
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: checkInToFormValues(checkIn),
    validators: {
      onSubmit: getCheckInFormSchema(),
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      if (intentRef.current === 'submit' && !hasSubstantiveResponse(value)) {
        setFormError(clientCheckInsCopy.form.needResponse);
        return;
      }
      try {
        const payload = formValuesToUpdatePayload(value);
        if (intentRef.current === 'submit') {
          await onSubmit(payload);
        } else {
          await onSave(payload);
        }
      } catch (error) {
        setFormError(mapCheckInError(error).description);
      }
    },
  });

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {formError ? (
        <Alert variant="danger" id={formErrorId}>
          <div className="flex gap-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{formError}</p>
          </div>
        </Alert>
      ) : null}

      <div className="client-surface-card client-surface-card--flush divide-y divide-border overflow-hidden">
        <section className="space-y-4 p-5 sm:p-6" aria-labelledby="check-in-period-heading">
        <h2 id="check-in-period-heading" className="text-base font-semibold tracking-tight">
          {clientCheckInsCopy.current.period}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.Field name="periodStart">
            {(fieldApi) => {
              const message = firstFieldError(fieldApi.state.meta.errors);
              const errorId = message ? 'draft-period-start-error' : undefined;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor="draft-period-start">{clientCheckInsCopy.create.periodStart}</Label>
                  <Input
                    id="draft-period-start"
                    type="date"
                    className="min-h-12"
                    value={fieldApi.state.value}
                    aria-invalid={Boolean(message)}
                    aria-describedby={errorId}
                    onBlur={fieldApi.handleBlur}
                    onChange={(event) => fieldApi.handleChange(event.target.value)}
                  />
                  {message ? (
                    <p id={errorId} className="text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
          <form.Field name="periodEnd">
            {(fieldApi) => {
              const message = firstFieldError(fieldApi.state.meta.errors);
              const errorId = message ? 'draft-period-end-error' : undefined;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor="draft-period-end">{clientCheckInsCopy.create.periodEnd}</Label>
                  <Input
                    id="draft-period-end"
                    type="date"
                    className="min-h-12"
                    value={fieldApi.state.value}
                    aria-invalid={Boolean(message)}
                    aria-describedby={errorId}
                    onBlur={fieldApi.handleBlur}
                    onChange={(event) => fieldApi.handleChange(event.target.value)}
                  />
                  {message ? (
                    <p id={errorId} className="text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        </div>
      </section>

      <section className="space-y-5 p-5 sm:p-6" aria-labelledby="check-in-ratings-heading">
        <div className="space-y-1">
          <h2 id="check-in-ratings-heading" className="text-base font-semibold tracking-tight">
            {clientCheckInsCopy.form.ratingsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{clientCheckInsCopy.form.ratingsHint}</p>
        </div>
        {CHECK_IN_RATING_FIELDS.map((field) => (
          <form.Field key={field} name={field}>
            {(fieldApi) => {
              const message = firstFieldError(fieldApi.state.meta.errors);
              const errorId = message ? `${field}-error` : undefined;
              return (
                <div className="space-y-1">
                  <RatingScale
                    id={field}
                    label={clientCheckInsCopy.form[field]}
                    hint="1–5"
                    value={fieldApi.state.value}
                    invalid={Boolean(message)}
                    errorId={errorId}
                    onChange={(next) => fieldApi.handleChange(next)}
                  />
                  {message ? (
                    <p id={errorId} className="text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ))}
      </section>

      <section className="space-y-4 p-5 sm:p-6" aria-labelledby="check-in-adherence-heading">
        <div className="space-y-1">
          <h2 id="check-in-adherence-heading" className="text-base font-semibold tracking-tight">
            {clientCheckInsCopy.form.adherenceTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{clientCheckInsCopy.form.adherenceHint}</p>
        </div>
        {CHECK_IN_ADHERENCE_FIELDS.map((field) => (
          <form.Field key={field} name={field}>
            {(fieldApi) => {
              const message = firstFieldError(fieldApi.state.meta.errors);
              const errorId = message ? `${field}-error` : undefined;
              const hintId = `${field}-hint`;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor={field}>{clientCheckInsCopy.form[field]}</Label>
                  <div className="relative">
                    <Input
                      id={field}
                      inputMode="decimal"
                      className="min-h-12 font-mono tabular-nums pr-10"
                      value={fieldApi.state.value}
                      aria-invalid={Boolean(message)}
                      aria-describedby={message ? `${hintId} ${errorId}` : hintId}
                      onBlur={fieldApi.handleBlur}
                      onChange={(event) => fieldApi.handleChange(event.target.value)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      {clientCheckInsCopy.form.percent}
                    </span>
                  </div>
                  <p id={hintId} className="sr-only">
                    0–100
                  </p>
                  {message ? (
                    <p id={errorId} className="text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ))}
      </section>

      <section className="space-y-4 p-5 sm:p-6" aria-labelledby="check-in-notes-heading">
        <h2 id="check-in-notes-heading" className="text-base font-semibold tracking-tight">
          {clientCheckInsCopy.form.notesTitle}
        </h2>
        {CHECK_IN_TEXT_FIELDS.map((field) => (
          <form.Field key={field} name={field}>
            {(fieldApi) => {
              const message = firstFieldError(fieldApi.state.meta.errors);
              const errorId = message ? `${field}-error` : undefined;
              const hintId = `${field}-hint`;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor={field}>{clientCheckInsCopy.form[field]}</Label>
                  <textarea
                    id={field}
                    rows={4}
                    maxLength={CHECK_IN_TEXT_MAX_LENGTH}
                    className="flex min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/50"
                    value={fieldApi.state.value}
                    aria-invalid={Boolean(message)}
                    aria-describedby={message ? `${hintId} ${errorId}` : hintId}
                    onBlur={fieldApi.handleBlur}
                    onChange={(event) => fieldApi.handleChange(event.target.value)}
                  />
                  <p id={hintId} className="text-xs text-muted-foreground">
                    {clientCheckInsCopy.form.textHint}
                  </p>
                  {message ? (
                    <p id={errorId} className="text-sm text-foreground">
                      {message}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ))}
      </section>
      </div>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => {
          const busy = pending || isSubmitting;
          return (
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="min-h-14 w-full"
                disabled={busy}
                aria-describedby={formError ? formErrorId : undefined}
                onClick={() => {
                  intentRef.current = 'submit';
                }}
              >
                {busy && intentRef.current === 'submit' ? (
                  <>
                    <Spinner />
                    {clientCheckInsCopy.form.submitting}
                  </>
                ) : (
                  clientCheckInsCopy.form.submit
                )}
              </Button>
              <Button
                type="submit"
                variant="outline"
                className="min-h-12 w-full"
                disabled={busy}
                onClick={() => {
                  intentRef.current = 'save';
                }}
              >
                {busy && intentRef.current === 'save' ? (
                  <>
                    <Spinner />
                    {clientCheckInsCopy.form.saving}
                  </>
                ) : (
                  clientCheckInsCopy.form.saveDraft
                )}
              </Button>
            </div>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
