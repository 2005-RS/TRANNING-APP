import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert, MailCheck } from 'lucide-react';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { usePasswordResetCopy } from '@/features/password-reset/copy';
import {
  FieldErrorText,
  PasswordResetLayout,
} from '@/features/password-reset/components/password-reset-layout';
import { resetErrorKind, resetErrorMessage } from '@/features/password-reset/lib/map-reset-error';
import {
  getForgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/features/password-reset/schemas';
import { authForgotPassword } from '@/generated/auth/auth';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

export function ForgotPasswordPage() {
  const copy = usePasswordResetCopy();
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <PasswordResetLayout title={copy.forgot.sentTitle}>
        <div className="space-y-5">
          <Alert>
            <div className="flex gap-2">
              <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{copy.forgot.sentBody(sentTo)}</p>
            </div>
          </Alert>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 min-h-12 w-full"
            onClick={() => setSentTo(null)}
          >
            {copy.forgot.sendAnother}
          </Button>
        </div>
      </PasswordResetLayout>
    );
  }

  return (
    <PasswordResetLayout title={copy.forgot.title} subtitle={copy.forgot.subtitle}>
      <ForgotPasswordForm onSent={setSentTo} />
    </PasswordResetLayout>
  );
}

function ForgotPasswordForm({ onSent }: { onSent: (email: string) => void }) {
  const copy = usePasswordResetCopy();
  const emailId = useId();
  const emailErrorId = `${emailId}-error`;
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '' } satisfies ForgotPasswordValues,
    validators: { onSubmit: getForgotPasswordSchema() },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const email = value.email.trim();
      try {
        await authForgotPassword({ email });
        onSent(email);
      } catch (error) {
        const kind = resetErrorKind(error);
        setFormError(resetErrorMessage(kind === 'invalid-link' ? 'generic' : kind));
      }
    },
  });

  return (
    <form
      noValidate
      className="space-y-5"
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

      <form.Field name="email">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const invalid = Boolean(message);
          return (
            <div className="space-y-2">
              <Label htmlFor={emailId}>{copy.forgot.emailLabel}</Label>
              <Input
                id={emailId}
                name={field.name}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={field.state.value}
                aria-invalid={invalid}
                aria-describedby={invalid ? emailErrorId : undefined}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-12 min-h-12"
              />
              {invalid && message ? <FieldErrorText id={emailErrorId} message={message} /> : null}
            </div>
          );
        }}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            size="lg"
            className="h-12 min-h-12 w-full"
            disabled={isSubmitting}
            aria-describedby={formError ? formErrorId : undefined}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                {copy.forgot.submitting}
              </>
            ) : (
              copy.forgot.submit
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
