import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert } from 'lucide-react';
import type { CreateCheckInDto } from '@/generated/models';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { mapCheckInError } from '@/features/client-check-ins/lib/map-error';
import { defaultPeriodRange } from '@/features/client-check-ins/lib/period';
import { getCreatePeriodSchema } from '@/features/client-check-ins/schemas/check-in-form-schema';
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

export function CreateCheckInSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateCheckInDto) => Promise<void>;
}) {
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: defaultPeriodRange(),
    validators: {
      onSubmit: getCreatePeriodSchema(),
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await onCreate({
          periodStart: value.periodStart,
          periodEnd: value.periodEnd,
        });
        onOpenChange(false);
      } catch (error) {
        setFormError(mapCheckInError(error).description);
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
      <SheetContent side="bottom" className="flex max-h-[90svh] flex-col overflow-hidden px-0">
        <SheetHeader>
          <SheetTitle>{clientCheckInsCopy.create.title}</SheetTitle>
          <SheetDescription>{clientCheckInsCopy.create.description}</SheetDescription>
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

            <form.Field name="periodStart">
              {(fieldApi) => {
                const message = firstFieldError(fieldApi.state.meta.errors);
                const errorId = message ? 'check-in-period-start-error' : undefined;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor="check-in-period-start">{clientCheckInsCopy.create.periodStart}</Label>
                    <Input
                      id="check-in-period-start"
                      type="date"
                      value={fieldApi.state.value}
                      aria-invalid={Boolean(message)}
                      aria-describedby={errorId}
                      className="min-h-12"
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
                const errorId = message ? 'check-in-period-end-error' : undefined;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor="check-in-period-end">{clientCheckInsCopy.create.periodEnd}</Label>
                    <Input
                      id="check-in-period-end"
                      type="date"
                      value={fieldApi.state.value}
                      aria-invalid={Boolean(message)}
                      aria-describedby={errorId}
                      className="min-h-12"
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

          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <>
                  <Button
                    type="submit"
                    className="min-h-12 w-full"
                    disabled={isSubmitting}
                    aria-describedby={formError ? formErrorId : undefined}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner />
                        {clientCheckInsCopy.create.submitting}
                      </>
                    ) : (
                      clientCheckInsCopy.create.submit
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full"
                    disabled={isSubmitting}
                    onClick={() => onOpenChange(false)}
                  >
                    {clientCheckInsCopy.create.cancel}
                  </Button>
                </>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
