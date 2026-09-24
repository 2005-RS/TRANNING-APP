import { useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TrainerResponseDto } from '@/generated/models';
import { useClientTrainerAssignmentsSetTrainer } from '@/generated/clients/clients';
import { useTrainersList } from '@/generated/trainers/trainers';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { AdminFormError } from '@/features/admin-workspace/components/admin-primitives';
import { adminMutationError } from '@/features/admin-workspace/lib/errors';
import { fullName } from '@/features/admin-workspace/lib/formatters';
import { invalidateClientAssignment } from '@/features/admin-workspace/lib/invalidate';
import { interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';
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
import { Skeleton } from '@/shared/ui/skeleton';

/** Backend maximum for `GET /trainers`; the filter narrows larger rosters server-side. */
const TRAINER_OPTIONS_LIMIT = 100;
const FILTER_DEBOUNCE_MS = 300;

export function AssignmentSheet({
  open,
  onOpenChange,
  client,
  currentTrainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: { id: string; name: string; disabled: boolean };
  currentTrainer: TrainerResponseDto | null | undefined;
}) {
  const copy = useAdminWorkspaceCopy();
  const queryClient = useQueryClient();
  const setTrainer = useClientTrainerAssignmentsSetTrainer();
  const filterId = useId();
  const legendId = useId();
  const [filter, setFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setAppliedFilter(filter.trim()), FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [filter]);

  const trainers = useTrainersList(
    { page: 1, limit: TRAINER_OPTIONS_LIMIT, status: 'ACTIVE', search: appliedFilter || undefined },
    {
      query: {
        enabled: open && !client.disabled,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        placeholderData: (previous) => previous,
      },
    },
  );

  function close(next: boolean) {
    if (setTrainer.isPending) {
      return;
    }
    if (!next) {
      setFilter('');
      setAppliedFilter('');
      setTrainerId('');
      setError(null);
    }
    onOpenChange(next);
  }

  async function submit() {
    if (setTrainer.isPending) {
      return;
    }
    if (!trainerId) {
      setError(copy.common.fieldRequired);
      return;
    }
    setError(null);
    try {
      await setTrainer.mutateAsync({ clientId: client.id, data: { trainerId } });
      await invalidateClientAssignment(queryClient, client.id);
      toast.success(copy.clients.assignedToast);
      setTrainerId('');
      setFilter('');
      setAppliedFilter('');
      onOpenChange(false);
    } catch (err) {
      setError(adminMutationError(err, 'assignment', copy));
      await invalidateClientAssignment(queryClient, client.id);
    }
  }

  const options = trainers.data?.data ?? [];
  const title = currentTrainer ? copy.clients.changeTrainer : copy.clients.assignTrainer;

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" closeLabel={copy.close} className="w-[min(30rem,100vw)] bg-background p-0">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{client.name}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {client.disabled ? (
              <Alert variant="muted">{copy.clients.assignDisabledHint}</Alert>
            ) : (
              <>
                {currentTrainer ? (
                  <p className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                    {copy.clients.reassignNote}
                  </p>
                ) : null}
                <AdminFormError error={error} />
                <div className="space-y-1.5">
                  <Label htmlFor={filterId}>{copy.clients.trainerFilter}</Label>
                  <Input
                    id={filterId}
                    type="search"
                    value={filter}
                    placeholder={copy.clients.trainerFilterPlaceholder}
                    autoComplete="off"
                    onChange={(event) => setFilter(event.target.value)}
                  />
                </div>
                <fieldset aria-labelledby={legendId} aria-busy={trainers.isFetching || undefined}>
                  <legend id={legendId} className="mb-2 text-sm font-medium">
                    {copy.assignments.pickTrainer}
                  </legend>
                  {trainers.isPending ? (
                    <div className="space-y-2" role="status" aria-label={copy.clients.loadingTrainers}>
                      <Skeleton className="h-14" />
                      <Skeleton className="h-14" />
                      <Skeleton className="h-14" />
                    </div>
                  ) : trainers.isError ? (
                    <div className="space-y-3">
                      <Alert variant="danger">{adminMutationError(trainers.error, 'status', copy)}</Alert>
                      <Button variant="outline" size="sm" onClick={() => void trainers.refetch()}>
                        {copy.retry}
                      </Button>
                    </div>
                  ) : options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.clients.noActiveTrainers}</p>
                  ) : (
                    <ul className="space-y-2">
                      {options.map((trainer) => {
                        const isCurrent = trainer.id === currentTrainer?.id;
                        const checked = trainerId === trainer.id;
                        return (
                          <li key={trainer.id}>
                            <label
                              className={cn(
                                'flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm',
                                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                                checked && 'border-primary bg-primary/5',
                                isCurrent && 'cursor-not-allowed opacity-60',
                              )}
                            >
                              <input
                                type="radio"
                                name={`assign-trainer-${client.id}`}
                                value={trainer.id}
                                className="size-4 accent-primary"
                                checked={checked}
                                disabled={isCurrent}
                                onChange={() => setTrainerId(trainer.id)}
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {isCurrent
                                    ? interpolate(copy.clients.currentTrainerOption, { name: fullName(trainer.user) })
                                    : fullName(trainer.user)}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">{trainer.user.email}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </fieldset>
              </>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="ghost" disabled={setTrainer.isPending} onClick={() => close(false)}>
              {copy.cancel}
            </Button>
            {client.disabled ? null : (
              <Button type="button" disabled={setTrainer.isPending || !trainerId} onClick={() => void submit()}>
                {setTrainer.isPending ? copy.saving : title}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
