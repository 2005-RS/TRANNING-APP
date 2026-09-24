import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  TrainingPlanResponseDtoStatus,
  TrainingPlanWorkoutInputDtoScheduledDay,
  UpdateTrainingPlanStatusDtoStatus,
  WorkoutTemplatesListStatus,
  type TrainingPlanExerciseResponseDto,
  type TrainingPlanWorkoutInputDto,
  type TrainingPlanWorkoutInputDtoNotes,
  type UpdateTrainingPlanExerciseDto,
  type UpdateTrainingPlanExerciseDtoDurationSeconds,
  type UpdateTrainingPlanExerciseDtoNotes,
  type UpdateTrainingPlanExerciseDtoRepsMax,
  type UpdateTrainingPlanExerciseDtoRepsMin,
  type UpdateTrainingPlanExerciseDtoTargetLoadKg,
} from '@/generated/models';
import {
  useTrainingPlansGetById,
  useTrainingPlansReplaceWorkouts,
  useTrainingPlansUpdateExercise,
  useTrainingPlansUpdateStatus,
} from '@/generated/training-plans/training-plans';
import { useWorkoutTemplatesList } from '@/generated/workout-templates/workout-templates';
import { NativeSelect, TextArea, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { parseDecimalInput } from '@/features/trainer-workspace/lib/finite-number';
import { asOpenApiField } from '@/features/trainer-workspace/lib/openapi-field';
import { invalidateTrainerTraining } from '@/features/trainer-workspace/lib/invalidate';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId, useTrainerRouteId } from '@/features/trainer-workspace/lib/use-client-id';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const copy = trainerWorkspaceCopy.training;
const days = Object.values(TrainingPlanWorkoutInputDtoScheduledDay).filter(
  (value): value is Exclude<typeof value, null> => typeof value === 'string',
);

export function TrainerTrainingPlanDetailPage() {
  const clientId = useTrainerClientId();
  const planId = useTrainerRouteId('planId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [scheduledDay, setScheduledDay] = useState('');
  const planQuery = useTrainingPlansGetById(clientId, planId, {
    query: { enabled: Boolean(clientId && planId), staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false },
  });
  const templatesQuery = useWorkoutTemplatesList(
    { limit: 50, status: WorkoutTemplatesListStatus.ACTIVE },
    { query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );
  const replaceWorkouts = useTrainingPlansReplaceWorkouts();
  const updateStatus = useTrainingPlansUpdateStatus();

  async function persistWorkouts(workouts: TrainingPlanWorkoutInputDto[]) {
    setError(null);
    try {
      await replaceWorkouts.mutateAsync({ clientId, planId, data: { workouts } });
      await invalidateTrainerTraining(queryClient, clientId);
      toast.success(copy.saveWorkouts);
    } catch (err) {
      setError(mapApiError(err).description);
    }
  }

  if (planQuery.isPending) {
    return (
      <WorkspaceSurface>
        <TrainerSectionSkeleton label={copy.loadingLabel} />
      </WorkspaceSurface>
    );
  }
  if (planQuery.isError || !planQuery.data) {
    return (
      <TrainerErrorState
        error={planQuery.error}
        retrying={planQuery.isFetching}
        onRetry={() => {
          if (!planQuery.isFetching) {
            void planQuery.refetch();
          }
        }}
      />
    );
  }

  const plan = planQuery.data;
  const currentWorkouts: TrainingPlanWorkoutInputDto[] = plan.workouts.map((workout) => ({
    workoutTemplateId: workout.sourceWorkoutTemplateId,
    scheduledDay: workout.scheduledDay ?? null,
    notes: asOpenApiField<TrainingPlanWorkoutInputDtoNotes | undefined>(workout.notes ?? null),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              void navigate({ to: '/trainer/clients/$clientId/training', params: { clientId } });
            }}
          >
            {copy.title}
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
          {plan.description ? <p className="text-sm text-muted-foreground">{plan.description}</p> : null}
        </div>
        <StatusBadge status={plan.status} />
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {plan.status === TrainingPlanResponseDtoStatus.DRAFT ? (
        <WorkspaceSurface className="flex flex-wrap gap-2">
          <p className="w-full text-sm text-muted-foreground">{copy.activateHint}</p>
          <Button
            disabled={updateStatus.isPending}
            onClick={async () => {
              setError(null);
              try {
                await updateStatus.mutateAsync({
                  clientId,
                  planId,
                  data: { status: UpdateTrainingPlanStatusDtoStatus.ACTIVE },
                });
                await invalidateTrainerTraining(queryClient, clientId);
                toast.success(trainerWorkspaceCopy.activate);
              } catch (err) {
                setError(mapApiError(err).description);
              }
            }}
          >
            {trainerWorkspaceCopy.activate}
          </Button>
        </WorkspaceSurface>
      ) : plan.status === TrainingPlanResponseDtoStatus.ACTIVE ? (
        <WorkspaceSurface>
          <p className="text-sm text-muted-foreground">{copy.archiveHint}</p>
          <Button
            className="mt-3"
            variant="outline"
            disabled={updateStatus.isPending}
            onClick={async () => {
              setError(null);
              try {
                await updateStatus.mutateAsync({
                  clientId,
                  planId,
                  data: { status: UpdateTrainingPlanStatusDtoStatus.ARCHIVED },
                });
                await invalidateTrainerTraining(queryClient, clientId);
                toast.success(trainerWorkspaceCopy.archive);
              } catch (err) {
                setError(mapApiError(err).description);
              }
            }}
          >
            {trainerWorkspaceCopy.archive}
          </Button>
        </WorkspaceSurface>
      ) : null}

      <WorkspaceSurface>
        <h3 className="text-base font-semibold">{copy.workouts}</h3>
        {plan.status === TrainingPlanResponseDtoStatus.DRAFT ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1">
              <Label htmlFor="template-select">{copy.template}</Label>
              <NativeSelect id="template-select" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                <option value="">{copy.template}</option>
                {(templatesQuery.data?.data ?? []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="w-44 space-y-1">
              <Label htmlFor="day-select">{copy.scheduledDay}</Label>
              <NativeSelect id="day-select" value={scheduledDay} onChange={(event) => setScheduledDay(event.target.value)}>
                <option value="">{copy.unscheduled}</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {trainerWorkspaceCopy.days[day]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button
              disabled={!templateId || replaceWorkouts.isPending}
              onClick={() => {
                void persistWorkouts([
                  ...currentWorkouts,
                  {
                    workoutTemplateId: templateId,
                    scheduledDay: scheduledDay
                      ? (scheduledDay as TrainingPlanWorkoutInputDto['scheduledDay'])
                      : null,
                  },
                ]);
                setTemplateId('');
              }}
            >
              {copy.addWorkout}
            </Button>
          </div>
        ) : null}
        {plan.workouts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{copy.noWorkouts}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {plan.workouts.map((workout, index) => (
              <li key={workout.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {workout.scheduledDay
                        ? trainerWorkspaceCopy.days[workout.scheduledDay]
                        : copy.unscheduled}
                    </p>
                  </div>
                  {plan.status === TrainingPlanResponseDtoStatus.DRAFT ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void persistWorkouts(currentWorkouts.filter((_, workoutIndex) => workoutIndex !== index));
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-3">
                  {workout.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      <ExerciseEditor
                        clientId={clientId}
                        planId={planId}
                        exercise={exercise}
                        editable={plan.status !== TrainingPlanResponseDtoStatus.ARCHIVED}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceSurface>
    </div>
  );
}

function ExerciseEditor({
  clientId,
  planId,
  exercise,
  editable,
}: {
  clientId: string;
  planId: string;
  exercise: TrainingPlanExerciseResponseDto;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const update = useTrainingPlansUpdateExercise();
  const [sets, setSets] = useState(String(exercise.sets));
  const [repsMin, setRepsMin] = useState(exercise.repsMin == null ? '' : String(exercise.repsMin));
  const [repsMax, setRepsMax] = useState(exercise.repsMax == null ? '' : String(exercise.repsMax));
  const [duration, setDuration] = useState(exercise.durationSeconds == null ? '' : String(exercise.durationSeconds));
  const [rest, setRest] = useState(String(exercise.restSeconds));
  const [load, setLoad] = useState(exercise.targetLoadKg == null ? '' : String(exercise.targetLoadKg));
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="font-medium">{exercise.exerciseName}</p>
      <p className="text-xs text-muted-foreground">{exercise.prescriptionType}</p>
      {editable ? (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const data: UpdateTrainingPlanExerciseDto = {
              sets: Number(sets),
              restSeconds: Number(rest),
              targetLoadKg: asOpenApiField<UpdateTrainingPlanExerciseDtoTargetLoadKg | null>(
                parseDecimalInput(load),
              ),
              notes: asOpenApiField<UpdateTrainingPlanExerciseDtoNotes | undefined>(notes.trim() || null),
            };
            if (exercise.prescriptionType === 'REPS') {
              data.repsMin = asOpenApiField<UpdateTrainingPlanExerciseDtoRepsMin>(Number(repsMin));
              data.repsMax = asOpenApiField<UpdateTrainingPlanExerciseDtoRepsMax>(Number(repsMax));
            } else {
              data.durationSeconds = asOpenApiField<UpdateTrainingPlanExerciseDtoDurationSeconds>(
                Number(duration),
              );
            }
            try {
              await update.mutateAsync({
                clientId,
                planId,
                planExerciseId: exercise.id,
                data,
              });
              await invalidateTrainerTraining(queryClient, clientId);
              toast.success(copy.saveExercise);
            } catch (err) {
              setError(mapApiError(err).description);
            }
          }}
        >
          {error ? <Alert variant="danger" className="sm:col-span-4">{error}</Alert> : null}
          <Field label={copy.sets} value={sets} onChange={setSets} />
          {exercise.prescriptionType === 'REPS' ? (
            <>
              <Field label="Reps min" value={repsMin} onChange={setRepsMin} />
              <Field label="Reps max" value={repsMax} onChange={setRepsMax} />
            </>
          ) : (
            <Field label={copy.duration} value={duration} onChange={setDuration} />
          )}
          <Field label={copy.rest} value={rest} onChange={setRest} />
          <Field label={copy.load} value={load} onChange={setLoad} />
          <div className="space-y-1 sm:col-span-3">
            <Label>{copy.notes}</Label>
            <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={update.isPending}>
              {copy.saveExercise}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-2 font-mono text-sm tabular-nums">
          {exercise.sets} × {exercise.repsMin ?? exercise.durationSeconds}
          {exercise.targetLoadKg != null ? ` @ ${exercise.targetLoadKg} kg` : ''}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
