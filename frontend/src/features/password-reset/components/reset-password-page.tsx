import { useEffect, useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { usePasswordResetCopy } from '@/features/password-reset/copy';
import {
  FieldErrorText,
  PasswordResetLayout,
} from '@/features/password-reset/components/password-reset-layout';
import { resetErrorKind, resetErrorMessage } from '@/features/password-reset/lib/map-reset-error';
import { readResetToken } from '@/features/password-reset/lib/reset-token';
import {
  getResetPasswordSchema,
  RESET_PASSWORD_MAX_LENGTH,
  type ResetPasswordValues,
} from '@/features/password-reset/schemas';
import { authResetPassword } from '@/generated/auth/auth';
import { cn } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { buttonVariants } from '@/shared/ui/button-variants';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

type ResetState = 'form' | 'done' | 'invalid';

export function ResetPasswordPage() {
  const copy = usePasswordResetCopy();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const navigate = useNavigate();
  const [token] = useState(() => readResetToken(hash));
  const [state, setState] = useState<ResetState>(token ? 'form' : 'invalid');

  useEffect(() => {
    if (hash) {
      void navigate({ to: '/reset-password', replace: true });
    }
  }, [hash, navigate]);

  if (state === 'done') {
    return (
      <PasswordResetLayout title={copy.reset.doneTitle}>
        <div className="space-y-5">
          <Alert>
            <div className="flex gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{copy.reset.doneBody}</p>
            </div>
          </Alert>
          <Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {copy.reset.signIn}
          </Link>
        </div>
      </PasswordResetLayout>
    );
  }

  if (state === 'invalid' || !token) {
    return (
      <PasswordResetLayout title={copy.reset.invalidTitle} subtitle={copy.reset.invalidBody}>
        <Link to="/forgot-password" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          {copy.reset.requestNew}
        </Link>
      </PasswordResetLayout>
    );
  }

  return (
    <PasswordResetLayout title={copy.reset.title} subtitle={copy.reset.subtitle}>
      <ResetPasswordForm
        token={token}
        onDone={() => setState('done')}
        onInvalid={() => setState('invalid')}
      />
    </PasswordResetLayout>
  );
}

type ResetPasswordFormProps = {
  token: string;
  onDone: () => void;
  onInvalid: () => void;
};

function ResetPasswordForm({ token, onDone, onInvalid }: ResetPasswordFormProps) {
  const copy = usePasswordResetCopy();
  const passwordId = useId();
  const confirmId = useId();
  const hintId = useId();
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: '', confirm: '' } satisfies ResetPasswordValues,
    validators: { onSubmit: getResetPasswordSchema() },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await authResetPassword({ token, password: value.password });
        onDone();
      } catch (error) {
        const kind = resetErrorKind(error);
        if (kind === 'invalid-link') {
          onInvalid();
          return;
        }
        setFormError(resetErrorMessage(kind));
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

      <form.Field name="password">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const errorId = `${passwordId}-error`;
          return (
            <div className="space-y-2">
              <Label htmlFor={passwordId}>{copy.reset.passwordLabel}</Label>
              <Input
                id={passwordId}
                name={field.name}
                type="password"
                autoComplete="new-password"
                maxLength={RESET_PASSWORD_MAX_LENGTH}
                value={field.state.value}
                aria-invalid={Boolean(message)}
                aria-describedby={message ? `${hintId} ${errorId}` : hintId}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-12 min-h-12"
              />
              <p id={hintId} className="text-xs text-muted-foreground">
                {copy.reset.passwordHint}
              </p>
              {message ? <FieldErrorText id={errorId} message={message} /> : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="confirm">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const errorId = `${confirmId}-error`;
          return (
            <div className="space-y-2">
              <Label htmlFor={confirmId}>{copy.reset.confirmLabel}</Label>
              <Input
                id={confirmId}
                name={field.name}
                type="password"
                autoComplete="new-password"
                maxLength={RESET_PASSWORD_MAX_LENGTH}
                value={field.state.value}
                aria-invalid={Boolean(message)}
                aria-describedby={message ? errorId : undefined}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="h-12 min-h-12"
              />
              {message ? <FieldErrorText id={errorId} message={message} /> : null}
            </div>
          );
        }}
      </form.Field>

      <form.Subscribe selector={(formState) => formState.isSubmitting}>
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
                {copy.reset.submitting}
              </>
            ) : (
              copy.reset.submit
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
