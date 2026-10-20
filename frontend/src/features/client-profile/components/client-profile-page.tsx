import { useEffect, useId, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { authCopy } from '@/features/auth/copy';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { useClientProfileCopy } from '@/features/client-profile/copy';
import {
  getProfileSchema,
  PROFILE_GOAL_NOTES_MAX_LENGTH,
  type ProfileFormValues,
} from '@/features/client-profile/schemas/profile-schema';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { getClientsMeQueryKey, useClientsMe, useClientsUpdateMe } from '@/generated/clients/clients';
import {
  ClientSelfUpdateDtoExperienceLevel,
  ClientSelfUpdateDtoPrimaryGoal,
  type ClientResponseDto,
  type ClientSelfUpdateDto,
} from '@/generated/models';
import { mapApiError } from '@/shared/errors/api-error';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { Spinner } from '@/shared/ui/spinner';

const EMPTY_VALUES: ProfileFormValues = {
  phone: '',
  primaryGoal: '',
  experienceLevel: '',
  goalNotes: '',
};

const FIELD_CLASS =
  'w-full rounded-md border border-input bg-transparent px-3 text-sm ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

function useProfileForm(onSubmit: (values: ProfileFormValues) => Promise<void>) {
  return useForm({
    defaultValues: EMPTY_VALUES,
    validators: { onSubmit: getProfileSchema() },
    onSubmit: ({ value }) => onSubmit(value),
  });
}

type ProfileFormApi = ReturnType<typeof useProfileForm>;

export function ClientProfilePage() {
  const copy = useClientProfileCopy();
  const queryClient = useQueryClient();
  const { logout } = useAuthSession();
  const profile = useClientsMe();
  const update = useClientsUpdateMe();
  const [saveError, setSaveError] = useState<string | null>(null);
  const phoneId = useId();
  const goalId = useId();
  const levelId = useId();
  const notesId = useId();

  const form = useProfileForm(async (values) => {
    const current = profile.data;
    if (!current) {
      return;
    }
    const payload = changedFields(values, current);
    if (Object.keys(payload).length === 0) {
      toast.success(copy.saved);
      return;
    }
    setSaveError(null);
    try {
      await update.mutateAsync({ data: payload });
      await queryClient.invalidateQueries({ queryKey: getClientsMeQueryKey() });
      toast.success(copy.saved);
    } catch {
      // Never render backend text; a generic, localized message is enough here.
      setSaveError(copy.saveError);
    }
  });

  useEffect(() => {
    const current = profile.data;
    if (!current) {
      return;
    }
    form.reset({
      phone: current.phone ?? '',
      primaryGoal: current.primaryGoal,
      experienceLevel: current.experienceLevel,
      goalNotes: current.goalNotes ?? '',
    });
  }, [form, profile.data]);

  if (profile.isPending) {
    return (
      <PageContainer density="client" className="mx-auto max-w-lg" aria-busy="true">
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </PageContainer>
    );
  }

  if (profile.isError || !profile.data) {
    const mapped = mapApiError(profile.error);
    return (
      <PageContainer density="client" className="mx-auto max-w-lg">
        <PageHeader className="mb-6">
          <PageTitle>{copy.title}</PageTitle>
        </PageHeader>
        <section className="client-surface-card space-y-3" role="alert">
          <h2 className="text-lg font-semibold">{mapped.title}</h2>
          <p className="text-sm text-muted-foreground">{mapped.description}</p>
          <Button
            className="min-h-12"
            disabled={profile.isFetching}
            onClick={() => void profile.refetch()}
          >
            {copy.retry}
          </Button>
        </section>
      </PageContainer>
    );
  }

  const user = profile.data.user;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.description}</PageDescription>
        </div>
      </PageHeader>

      {user ? (
        <div className="space-y-6">
          <section className="client-surface-card space-y-4" aria-labelledby="profile-account">
            <h2 id="profile-account" className="text-lg font-semibold">
              {copy.account}
            </h2>
            <ReadOnlyField label={copy.name} value={`${user.firstName} ${user.lastName}`} />
            <ReadOnlyField label={copy.email} value={user.email} hint={copy.emailHint} />
          </section>

          <form
            className="client-surface-card space-y-4"
            aria-labelledby="profile-preferences"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <h2 id="profile-preferences" className="text-lg font-semibold">
              {copy.preferences}
            </h2>
            <PhoneField form={form} id={phoneId} label={copy.phone} />
            <SelectField
              form={form}
              name="primaryGoal"
              id={goalId}
              label={copy.primaryGoal}
              options={Object.values(ClientSelfUpdateDtoPrimaryGoal)}
              labels={authCopy.register.goals}
            />
            <SelectField
              form={form}
              name="experienceLevel"
              id={levelId}
              label={copy.experienceLevel}
              options={Object.values(ClientSelfUpdateDtoExperienceLevel)}
              labels={authCopy.register.levels}
            />
            <form.Field name="goalNotes">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={notesId}>{copy.goalNotes}</Label>
                  <textarea
                    id={notesId}
                    name={field.name}
                    value={field.state.value}
                    maxLength={PROFILE_GOAL_NOTES_MAX_LENGTH}
                    aria-describedby={`${notesId}-hint`}
                    className={`${FIELD_CLASS} min-h-28 py-2`}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <p id={`${notesId}-hint`} className="text-sm text-muted-foreground">
                    {copy.goalNotesHint}
                  </p>
                </div>
              )}
            </form.Field>
            {saveError ? (
              <p className="text-sm text-danger" role="alert">
                {saveError}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="min-h-12 w-full" disabled={update.isPending}>
              {update.isPending ? (
                <>
                  <Spinner />
                  {copy.saving}
                </>
              ) : (
                copy.save
              )}
            </Button>
          </form>

          <section className="client-surface-card space-y-3" aria-labelledby="profile-security">
            <h2 id="profile-security" className="text-lg font-semibold">
              {copy.security}
            </h2>
            <Link
              to="/forgot-password"
              className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
            >
              {copy.changePassword}
            </Link>
            <p className="text-sm text-muted-foreground">{copy.changePasswordHint}</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full"
              onClick={() => void logout()}
            >
              {copy.logout}
            </Button>
          </section>
        </div>
      ) : null}
    </PageContainer>
  );
}

function changedFields(values: ProfileFormValues, current: ClientResponseDto): ClientSelfUpdateDto {
  const payload: ClientSelfUpdateDto = {};
  const phone = values.phone.trim();
  if (phone !== (current.phone ?? '')) {
    // Nullable string fields are emitted as open objects by the OpenAPI generator.
    payload.phone = asOpenApiField<ClientSelfUpdateDto['phone']>(phone || null);
  }
  if (values.primaryGoal !== current.primaryGoal) {
    payload.primaryGoal = values.primaryGoal as ClientSelfUpdateDto['primaryGoal'];
  }
  if (values.experienceLevel !== current.experienceLevel) {
    payload.experienceLevel = values.experienceLevel as ClientSelfUpdateDto['experienceLevel'];
  }
  const goalNotes = values.goalNotes.trim();
  if (goalNotes !== (current.goalNotes ?? '')) {
    payload.goalNotes = asOpenApiField<ClientSelfUpdateDto['goalNotes']>(goalNotes || null);
  }
  return payload;
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PhoneField({ form, id, label }: { form: ProfileFormApi; id: string; label: string }) {
  return (
    <form.Field name="phone">
      {(field) => {
        const error = firstFieldError(field.state.meta.errors);
        const errorId = `${id}-error`;
        return (
          <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              name={field.name}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={field.state.value}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="h-12 min-h-12"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {error ? (
              <p id={errorId} className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        );
      }}
    </form.Field>
  );
}

function SelectField({
  form,
  name,
  id,
  label,
  options,
  labels,
}: {
  form: ProfileFormApi;
  name: 'primaryGoal' | 'experienceLevel';
  id: string;
  label: string;
  options: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <div className="space-y-2">
          <Label htmlFor={id}>{label}</Label>
          <select
            id={id}
            name={field.name}
            value={field.state.value}
            className={`${FIELD_CLASS} h-12`}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {labels[option] ?? option}
              </option>
            ))}
          </select>
        </div>
      )}
    </form.Field>
  );
}
