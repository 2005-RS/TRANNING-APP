import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateWorkoutTemplateDto } from '@/generated/models';
import { useWorkoutTemplatesCreate } from '@/generated/workout-templates/workout-templates';
import { TextArea } from '@/features/trainer-workspace/components/workspace-surface';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerTemplates } from '@/features/trainer-workspace/lib/invalidate';
import { getTemplateSchema } from '@/features/trainer-workspace/schemas/plan-schemas';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function CreateTemplateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.templates;
  const queryClient = useQueryClient();
  const create = useWorkoutTemplatesCreate();
  const formErrorId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { name: '', description: '' },
    validators: { onSubmit: getTemplateSchema() },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const data: CreateWorkoutTemplateDto = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
      };
      try {
        await create.mutateAsync({ data });
        await invalidateTrainerTemplates(queryClient);
        form.reset();
        toast.success(copy.created);
        onOpenChange(false);
      } catch (err) {
        setFormError(mapApiError(err).description);
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
        side="right"
        closeLabel={copy.close}
        className="w-[min(26rem,90vw)] bg-background p-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>{copy.createTitle}</SheetTitle>
            <SheetDescription>{copy.createDescription}</SheetDescription>
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
              <form.Field name="name">
                {(field) => {
                  const message = firstFieldError(field.state.meta.errors);
                  return (
                    <div className="space-y-1.5">
                      <Label htmlFor="template-name">{copy.name}</Label>
                      <Input
                        id="template-name"
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={Boolean(message)}
                        aria-describedby={
                          message ? 'template-name-error' : formError ? formErrorId : undefined
                        }
                        autoComplete="off"
                        autoFocus={open}
                        required
                      />
                      {message ? (
                        <p id="template-name-error" className="text-sm text-danger">
                          {message}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              </form.Field>
              <form.Field name="description">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="template-description">{copy.descriptionLabel}</Label>
                    <TextArea
                      id="template-description"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      rows={4}
                    />
                  </div>
                )}
              </form.Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? trainerWorkspaceCopy.creating : copy.submitCreate}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
