import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert } from 'lucide-react';
import type { BodyMeasurementResponseDto, CreateBodyMeasurementDto, UpdateBodyMeasurementDto } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { BODY_METRIC_FIELDS, metricUnit } from '@/features/client-body/lib/metric-fields';
import {
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  measurementToFormValues,
} from '@/features/client-body/lib/measurement-payload';
import {
  emptyMeasurementFormValues,
  getMeasurementFormSchema,
} from '@/features/client-body/schemas/measurement-form-schema';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function MeasurementFormSheet({
  open,
  onOpenChange,
  measurement,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: BodyMeasurementResponseDto | null;
  onCreate: (data: CreateBodyMeasurementDto) => Promise<void>;
  onUpdate: (measurementId: string, data: UpdateBodyMeasurementDto) => Promise<void>;
}) {
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = measurement !== null;

  const form = useForm({
    defaultValues: measurement
      ? measurementToFormValues(measurement)
      : emptyMeasurementFormValues(),
    validators: {
      onSubmit: getMeasurementFormSchema(),
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        if (editing && measurement) {
          await onUpdate(
            measurement.id,
            formValuesToUpdatePayload(value) as UpdateBodyMeasurementDto,
          );
        } else {
          await onCreate(formValuesToCreatePayload(value) as CreateBodyMeasurementDto);
        }
        onOpenChange(false);
      } catch (error) {
        const mapped = mapApiError(error);
        setFormError(mapped.description);
      }
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setFormError(null);
        }
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="flex max-h-[90svh] flex-col overflow-hidden px-0"
      >
        <SheetHeader>
          <SheetTitle>
            {editing
              ? clientBodyCopy.measurements.editTitle
              : clientBodyCopy.measurements.createTitle}
          </SheetTitle>
          <SheetDescription>{clientBodyCopy.measurements.formDescription}</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {formError ? (
              <Alert variant="danger" id={formErrorId}>
                <div className="flex gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{formError}</p>
                </div>
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              {BODY_METRIC_FIELDS.map((field) => (
                <form.Field key={field} name={field}>
                  {(fieldApi) => {
                    const message = firstFieldError(fieldApi.state.meta.errors);
                    const invalid = Boolean(message);
                    const fieldId = `metric-${field}`;
                    const unit = metricUnit(field);
                    return (
                      <div className="min-w-0 space-y-1.5">
                        <Label htmlFor={fieldId}>
                          {clientBodyCopy.metrics[field]} ({unit})
                        </Label>
                        <Input
                          id={fieldId}
                          inputMode="decimal"
                          className="text-numeric h-12 min-h-12"
                          value={fieldApi.state.value}
                          aria-invalid={invalid}
                          onBlur={fieldApi.handleBlur}
                          onChange={(event) => fieldApi.handleChange(event.target.value)}
                        />
                        {invalid && message ? (
                          <p className="text-sm text-foreground">{message}</p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>
              ))}
            </div>

            <form.Field name="measuredAt">
              {(fieldApi) => (
                <div className="space-y-1.5">
                  <Label htmlFor="measured-at">{clientBodyCopy.measurements.measuredAt}</Label>
                  <Input
                    id="measured-at"
                    type="datetime-local"
                    className="h-12 min-h-12"
                    value={fieldApi.state.value}
                    onBlur={fieldApi.handleBlur}
                    onChange={(event) => fieldApi.handleChange(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {clientBodyCopy.measurements.measuredAtHint}
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(fieldApi) => {
                const message = firstFieldError(fieldApi.state.meta.errors);
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor="measurement-notes">{clientBodyCopy.measurements.notes}</Label>
                    <textarea
                      id="measurement-notes"
                      rows={3}
                      maxLength={1000}
                      className="flex min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      value={fieldApi.state.value}
                      onBlur={fieldApi.handleBlur}
                      onChange={(event) => fieldApi.handleChange(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {clientBodyCopy.measurements.notesHint}
                    </p>
                    {message ? <p className="text-sm text-foreground">{message}</p> : null}
                  </div>
                );
              }}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="min-h-12 w-full"
                  disabled={isSubmitting}
                  aria-describedby={formError ? formErrorId : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      {clientBodyCopy.measurements.saving}
                    </>
                  ) : (
                    clientBodyCopy.measurements.save
                  )}
                </Button>
              )}
            </form.Subscribe>
            <Button
              variant="outline"
              className="min-h-12 w-full"
              onClick={() => onOpenChange(false)}
            >
              {clientBodyCopy.measurements.cancel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
