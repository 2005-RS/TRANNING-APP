import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { TrainerResponseDto, TrainerSelfUpdateDto } from '@/generated/models';
import {
  getTrainersMeQueryKey,
  useTrainersMe,
  useTrainersUpdateMe,
} from '@/generated/trainers/trainers';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerPageSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { TextArea, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy, useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

const PHONE_MAX = 32;
const TITLE_MAX = 120;
const BIO_MAX = 2000;
const PHONE_PATTERN = /^[\d+\-\s().]*$/;

function getProfileSchema() {
  const copy = trainerWorkspaceCopy.profile;
  return z.object({
    phone: z
      .string()
      .trim()
      .max(PHONE_MAX, copy.tooLong(PHONE_MAX))
      .regex(PHONE_PATTERN, copy.phoneInvalid),
    professionalTitle: z.string().trim().max(TITLE_MAX, copy.tooLong(TITLE_MAX)),
    bio: z.string().trim().max(BIO_MAX, copy.tooLong(BIO_MAX)),
  });
}

type ProfileValues = z.infer<ReturnType<typeof getProfileSchema>>;

function profileDefaults(trainer: TrainerResponseDto): ProfileValues {
  return {
    phone: trainer.phone ?? '',
    professionalTitle: trainer.professionalTitle ?? '',
    bio: trainer.bio ?? '',
  };
}

export function TrainerProfilePage() {
  const copy = useTrainerWorkspaceCopy().profile;
  const query = useTrainersMe({
    query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });

  if (query.isPending) {
    return <TrainerPageSkeleton label={copy.loadingLabel} />;
  }
  if (query.isError || !query.data) {
    return (
      <TrainerPageError
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  const trainer = query.data;
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <PageHeader className="mb-0">
        <div className="space-y-2">
          <PageTitle>{copy.title}</PageTitle>
          <PageDescription>{copy.description}</PageDescription>
        </div>
      </PageHeader>
      <WorkspaceSurface className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{copy.account}</h2>
          <p className="text-sm text-muted-foreground">{copy.accountHint}</p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{copy.name}</dt>
            <dd className="font-medium">
              {trainer.user.firstName} {trainer.user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{copy.email}</dt>
            <dd className="break-all font-medium">{trainer.user.email}</dd>
          </div>
        </dl>
      </WorkspaceSurface>
      <ProfileForm key={trainer.updatedAt} trainer={trainer} />
    </PageContainer>
  );
}

function ProfileForm({ trainer }: { trainer: TrainerResponseDto }) {
  const copy = useTrainerWorkspaceCopy();
  const profileCopy = copy.profile;
  const queryClient = useQueryClient();
  const update = useTrainersUpdateMe();
  const formErrorId = useId();
  const headingId = useId();
  const phoneId = useId();
  const titleId = useId();
  const bioId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: profileDefaults(trainer),
    validators: { onSubmit: getProfileSchema() },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const phone = value.phone.trim();
      const professionalTitle = value.professionalTitle.trim();
      const bio = value.bio.trim();
      const data: TrainerSelfUpdateDto = {
        phone: asOpenApiField<TrainerSelfUpdateDto['phone']>(phone || null),
        professionalTitle: asOpenApiField<TrainerSelfUpdateDto['professionalTitle']>(
          professionalTitle || null,
        ),
        bio: asOpenApiField<TrainerSelfUpdateDto['bio']>(bio || null),
      };
      try {
        const saved = await update.mutateAsync({ data });
        queryClient.setQueryData(getTrainersMeQueryKey(), saved);
        toast.success(profileCopy.saved);
      } catch (err) {
        setFormError(mapApiError(err).description);
      }
    },
  });

  return (
    <WorkspaceSurface>
      <form
        noValidate
        className="space-y-5"
        aria-labelledby={headingId}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <h2 id={headingId} className="text-base font-semibold">
          {profileCopy.details}
        </h2>
        {formError ? (
          <Alert variant="danger" id={formErrorId}>
            <div className="flex gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{formError}</p>
            </div>
          </Alert>
        ) : null}

        <form.Field name="professionalTitle">
          {(field) => {
            const message = firstFieldError(field.state.meta.errors);
            return (
              <div className="space-y-1.5">
                <Label htmlFor={titleId}>
                  {profileCopy.professionalTitle}{' '}
                  <span className="font-normal text-muted-foreground">({profileCopy.optional})</span>
                </Label>
                <Input
                  id={titleId}
                  value={field.state.value}
                  placeholder={profileCopy.professionalTitlePlaceholder}
                  maxLength={TITLE_MAX}
                  autoComplete="organization-title"
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? `${titleId}-error` : undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {message ? (
                  <p id={`${titleId}-error`} className="text-sm text-danger">
                    {message}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="bio">
          {(field) => {
            const message = firstFieldError(field.state.meta.errors);
            return (
              <div className="space-y-1.5">
                <Label htmlFor={bioId}>
                  {profileCopy.bio}{' '}
                  <span className="font-normal text-muted-foreground">({profileCopy.optional})</span>
                </Label>
                <TextArea
                  id={bioId}
                  value={field.state.value}
                  rows={6}
                  maxLength={BIO_MAX}
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? `${bioId}-error` : undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {message ? (
                  <p id={`${bioId}-error`} className="text-sm text-danger">
                    {message}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="phone">
          {(field) => {
            const message = firstFieldError(field.state.meta.errors);
            const hintId = `${phoneId}-hint`;
            return (
              <div className="space-y-1.5">
                <Label htmlFor={phoneId}>
                  {profileCopy.phone}{' '}
                  <span className="font-normal text-muted-foreground">({profileCopy.optional})</span>
                </Label>
                <Input
                  id={phoneId}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={field.state.value}
                  maxLength={PHONE_MAX}
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? `${hintId} ${phoneId}-error` : hintId}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="sm:max-w-xs"
                />
                <p id={hintId} className="text-xs text-muted-foreground">
                  {profileCopy.phoneHint}
                </p>
                {message ? (
                  <p id={`${phoneId}-error`} className="text-sm text-danger">
                    {message}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe selector={(state) => [state.isSubmitting, state.isDirty] as const}>
          {([isSubmitting, isDirty]) => (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting || !isDirty}
                onClick={() => {
                  form.reset();
                  setFormError(null);
                }}
              >
                {profileCopy.reset}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                aria-describedby={formError ? formErrorId : undefined}
              >
                {isSubmitting ? copy.saving : copy.save}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </WorkspaceSurface>
  );
}
