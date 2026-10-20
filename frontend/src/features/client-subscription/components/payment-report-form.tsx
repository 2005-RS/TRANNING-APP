import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useClientSubscriptionCopy } from '@/features/client-subscription/copy';
import { minDate, today } from '@/features/client-subscription/lib/local-date';
import { paymentError } from '@/features/client-subscription/lib/payment-errors';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type PaymentFormValues = {
  reference: string;
  paidOn: string;
  payerPhone?: string;
};

type FieldErrors = Partial<Record<keyof PaymentFormValues, string>>;

export function PaymentReportForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
}) {
  const copy = useClientSubscriptionCopy();
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(today());
  const [payerPhone, setPayerPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = z.object({
    reference: z.string().trim().min(1, copy.referenceRequired).max(40, copy.referenceLength),
    paidOn: z.string().refine(
      (value) => value >= minDate() && value <= today(),
      { message: copy.invalidDate },
    ),
    payerPhone: z.string().refine((value) => value.length === 0 || /^\d{8}$/.test(value), {
      message: copy.payerPhoneInvalid,
    }),
  });

  function focusFirstInvalid(nextErrors: FieldErrors): void {
    if (nextErrors.reference) {
      document.getElementById('subscription-reference')?.focus();
    } else if (nextErrors.paidOn) {
      document.getElementById('subscription-paid-on')?.focus();
    } else if (nextErrors.payerPhone) {
      document.getElementById('subscription-payer-phone')?.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = schema.safeParse({ reference, paidOn, payerPhone });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof PaymentFormValues;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      setSubmitError(null);
      focusFirstInvalid(nextErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    try {
      await onSubmit({
        reference: parsed.data.reference,
        paidOn: parsed.data.paidOn,
        payerPhone: parsed.data.payerPhone || undefined,
      });
    } catch (error) {
      setSubmitError(paymentError(error, copy));
    }
  }

  return (
    <Card className="p-5">
      <form className="space-y-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <h2 className="font-semibold">{copy.report}</h2>
        {submitError ? <Alert variant="danger">{submitError}</Alert> : null}

        <FieldError id="subscription-reference" label={copy.reference} error={errors.reference}>
          <Input
            id="subscription-reference"
            value={reference}
            maxLength={40}
            aria-invalid={Boolean(errors.reference)}
            aria-describedby={errors.reference ? 'subscription-reference-error' : undefined}
            onChange={(event) => setReference(event.target.value)}
          />
        </FieldError>

        <FieldError id="subscription-paid-on" label={copy.paidOn} error={errors.paidOn}>
          <Input
            id="subscription-paid-on"
            type="date"
            min={minDate()}
            max={today()}
            value={paidOn}
            aria-invalid={Boolean(errors.paidOn)}
            aria-describedby={errors.paidOn ? 'subscription-paid-on-error' : undefined}
            onChange={(event) => setPaidOn(event.target.value)}
          />
        </FieldError>

        <FieldError id="subscription-payer-phone" label={copy.payerPhone} error={errors.payerPhone}>
          <Input
            id="subscription-payer-phone"
            inputMode="numeric"
            value={payerPhone}
            maxLength={8}
            aria-invalid={Boolean(errors.payerPhone)}
            aria-describedby={errors.payerPhone ? 'subscription-payer-phone-error' : undefined}
            onChange={(event) => setPayerPhone(event.target.value.replace(/\D/g, ''))}
          />
        </FieldError>

        <Button type="submit" disabled={pending}>{pending ? copy.reporting : copy.submit}</Button>
      </form>
    </Card>
  );
}

function FieldError({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
