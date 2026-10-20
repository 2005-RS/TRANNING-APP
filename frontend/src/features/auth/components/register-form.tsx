import { useId, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { CircleAlert } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from '@tanstack/react-router';
import {
  RegisterDtoExperienceLevel,
  RegisterDtoPrimaryGoal,
  type RegisterDto,
} from '@/generated/models';
import { useAuthCopy } from '@/features/auth/copy';
import { PasswordField } from '@/features/auth/components/password-field';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { mapApiError } from '@/shared/errors/api-error';
import {
  EMPTY_REGISTER_FORM_VALUES,
  getRegisterFormSchema,
  toRegisterDto,
  type RegisterFormValues,
} from '@/features/auth/schemas/register-schema';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

type RegisterFormProps = {
  onRegister: (dto: RegisterDto) => Promise<void>;
};

function useRegisterForm(handlers: {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  onSubmitInvalid: () => void;
}) {
  return useForm({
    defaultValues: EMPTY_REGISTER_FORM_VALUES,
    validators: {
      onSubmit: getRegisterFormSchema(),
    },
    onSubmitInvalid: handlers.onSubmitInvalid,
    onSubmit: ({ value }) => handlers.onSubmit(value),
  });
}

type RegisterFormApi = ReturnType<typeof useRegisterForm>;

export function RegisterForm({ onRegister }: RegisterFormProps) {
  const authCopy = useAuthCopy();
  const formRef = useRef<HTMLFormElement>(null);
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const primaryGoalId = useId();
  const experienceLevelId = useId();
  const termsId = useId();
  const formErrorId = useId();
  const reduceMotion = useReducedMotion();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useRegisterForm({
    onSubmitInvalid: () => {
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
    },
    onSubmit: async (value) => {
      setFormError(null);
      try {
        await onRegister(toRegisterDto(value));
      } catch (error) {
        const mapped = mapApiError(error);
        if (mapped.kind === 'conflict') {
          setFormError(authCopy.errors.duplicateEmail);
          return;
        }
        if (mapped.kind === 'rate-limited') {
          setFormError(authCopy.errors.registerRateLimited);
          return;
        }
        if (mapped.kind === 'invalid') {
          setFormError(authCopy.errors.registerInvalid);
          return;
        }
        setFormError(mapped.description);
      }
    },
  });

  return (
    <motion.form
      ref={formRef}
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
            <p>{formError}</p>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField fieldName="firstName" id={firstNameId} label={authCopy.register.firstNameLabel} form={form} />
        <TextField fieldName="lastName" id={lastNameId} label={authCopy.register.lastNameLabel} form={form} />
      </div>
      <TextField fieldName="email" id={emailId} label={authCopy.login.emailLabel} type="email" form={form} />

      <form.Field name="password">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const errorId = `${passwordId}-error`;
          return (
            <PasswordField
              id={passwordId}
              name={field.name}
              value={field.state.value}
              invalid={Boolean(message)}
              describedBy={message ? errorId : undefined}
              autoComplete="new-password"
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={
                message ? (
                  <FieldError id={errorId} message={message} />
                ) : null
              }
            />
          );
        }}
      </form.Field>

      <SelectField
        fieldName="primaryGoal"
        id={primaryGoalId}
        label={authCopy.register.primaryGoalLabel}
        placeholder={authCopy.register.primaryGoalLabel}
        values={Object.values(RegisterDtoPrimaryGoal)}
        labels={authCopy.register.goals}
        form={form}
      />
      <SelectField
        fieldName="experienceLevel"
        id={experienceLevelId}
        label={authCopy.register.experienceLevelLabel}
        placeholder={authCopy.register.experienceLevelLabel}
        values={Object.values(RegisterDtoExperienceLevel)}
        labels={authCopy.register.levels}
        form={form}
      />

      <form.Field name="acceptTerms">
        {(field) => {
          const message = firstFieldError(field.state.meta.errors);
          const errorId = `${termsId}-error`;
          return (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Input
                  id={termsId}
                  name={field.name}
                  type="checkbox"
                  checked={field.state.value}
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? errorId : undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  className="mt-0.5 size-5 min-h-5"
                />
                <Label htmlFor={termsId} className="leading-relaxed">
                  {authCopy.register.acceptTerms}
                </Label>
              </div>
              {message ? <FieldError id={errorId} message={message} /> : null}
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
            {isSubmitting ? <><Spinner />{authCopy.register.submitting}</> : authCopy.register.submit}
          </Button>
        )}
      </form.Subscribe>
      <p className="text-center text-sm text-muted-foreground">
        {authCopy.signUp.signInPrompt}{' '}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {authCopy.signUp.signInLink}
        </Link>
      </p>
    </motion.form>
  );
}

function TextField({
  fieldName,
  id,
  label,
  type = 'text',
  form,
}: {
  fieldName: 'firstName' | 'lastName' | 'email';
  id: string;
  label: string;
  type?: 'text' | 'email';
  form: RegisterFormApi;
}) {
  return (
    <form.Field name={fieldName}>
      {(field) => {
        const message = firstFieldError(field.state.meta.errors);
        const errorId = `${id}-error`;
        return (
          <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              name={field.name}
              type={type}
              autoComplete={fieldName === 'email' ? 'email' : fieldName === 'firstName' ? 'given-name' : 'family-name'}
              value={field.state.value}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? errorId : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              className="h-12 min-h-12"
            />
            {message ? <FieldError id={errorId} message={message} /> : null}
          </div>
        );
      }}
    </form.Field>
  );
}

function SelectField({
  fieldName,
  id,
  label,
  placeholder,
  values,
  labels,
  form,
}: {
  fieldName: 'primaryGoal' | 'experienceLevel';
  id: string;
  label: string;
  placeholder: string;
  values: readonly string[];
  labels: Record<string, string>;
  form: RegisterFormApi;
}) {
  return (
    <form.Field name={fieldName}>
      {(field) => {
        const message = firstFieldError(field.state.meta.errors);
        const errorId = `${id}-error`;
        return (
          <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <select
              id={id}
              name={field.name}
              value={field.state.value}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? errorId : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              className="flex h-12 min-h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="" disabled>{placeholder}</option>
              {values.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
            </select>
            {message ? <FieldError id={errorId} message={message} /> : null}
          </div>
        );
      }}
    </form.Field>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-foreground">
      <CircleAlert className="size-3.5 text-danger" aria-hidden />
      {message}
    </p>
  );
}
