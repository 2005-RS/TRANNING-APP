import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuthCopy } from '@/features/auth/copy';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { mapLoginError } from '@/features/auth/lib/map-login-error';
import { PasswordField } from '@/features/auth/components/password-field';
import {
  getLoginFormSchema,
  type LoginFormValues,
} from '@/features/auth/schemas/login-schema';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

type LoginFormProps = {
  onLogin: (values: LoginFormValues) => Promise<void>;
};

export function LoginForm({ onLogin }: LoginFormProps) {
  const authCopy = useAuthCopy();
  const emailId = useId();
  const passwordId = useId();
  const formErrorId = useId();
  const emailErrorId = `${emailId}-error`;
  const passwordErrorId = `${passwordId}-error`;
  const reduceMotion = useReducedMotion();
  const [formError, setFormError] = useState<{
    message: string;
    requestId?: string;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } satisfies LoginFormValues,
    validators: {
      onSubmit: getLoginFormSchema(),
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        await onLogin(value);
      } catch (error) {
        setFormError(mapLoginError(error));
      }
    },
  });

  return (
    <motion.form
      noValidate
      className="space-y-5"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
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
            <div className="space-y-1">
              <p>{formError.message}</p>
              {formError.requestId ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {authCopy.errors.supportHint}: {formError.requestId}
                </p>
              ) : null}
            </div>
          </div>
        </Alert>
      ) : null}

      <form.Field name="email">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const invalid = Boolean(message);
          return (
            <div className="space-y-2">
              <Label htmlFor={emailId}>{authCopy.login.emailLabel}</Label>
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
              {invalid && message ? (
                <p
                  id={emailErrorId}
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <CircleAlert className="size-3.5 text-danger" aria-hidden />
                  {message}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field name="password">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const invalid = Boolean(message);
          return (
            <PasswordField
              id={passwordId}
              name={field.name}
              value={field.state.value}
              invalid={invalid}
              describedBy={invalid ? passwordErrorId : undefined}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={
                invalid && message ? (
                  <p
                    id={passwordErrorId}
                    className="flex items-center gap-1.5 text-sm text-foreground"
                  >
                    <CircleAlert className="size-3.5 text-danger" aria-hidden />
                    {message}
                  </p>
                ) : null
              }
            />
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
                {authCopy.login.submitting}
              </>
            ) : (
              authCopy.login.submit
            )}
          </Button>
        )}
      </form.Subscribe>
    </motion.form>
  );
}
