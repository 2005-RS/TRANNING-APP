import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CircleX } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { ApiError, mapApiError } from '@/shared/errors/api-error';
import { UpdateWorkoutSessionStatusDtoStatus, WorkoutSessionResponseDtoStatus } from '@/generated/models';
import type { WorkoutSessionExerciseResponseDto } from '@/generated/models';
import { workoutCopy } from '@/features/workout-session/copy';
import { ConfirmSheet } from '@/features/workout-session/components/confirm-sheet';
import { ExerciseAccordion } from '@/features/workout-session/components/exercise-accordion';
import { RestBar } from '@/features/workout-session/components/rest-bar';
import { SessionHeader } from '@/features/workout-session/components/session-header';
import { StaleSessionAlert } from '@/features/workout-session/components/stale-session-alert';
import { WorkoutSummary } from '@/features/workout-session/components/workout-summary';
import { WorkoutErrorState } from '@/features/workout-session/components/workout-error-state';
import { WorkoutLoadingState } from '@/features/workout-session/components/workout-loading-state';
import { useRestTimer } from '@/features/workout-session/hooks/use-rest-timer';
import {
  useWorkoutSessionById,
  useWorkoutSessionMutations,
} from '@/features/workout-session/hooks/use-workout-session';
import { appendSetPayload, withoutLastSetPayload, type SetDraft } from '@/features/workout-session/lib/set-payload';
import { initialExerciseIndex, recordedSetCount } from '@/features/workout-session/lib/session-helpers';
import { isUuid } from '@/features/workout-session/lib/session-ids';
import { isPersonalRecord } from '@/features/workout-session/lib/personal-record';
import { isStaleSession } from '@/features/workout-session/lib/stale-session';

export function WorkoutFocusPage() {
  const { sessionId } = useParams({ from: '/client/workout/$sessionId' });
  const navigate = useNavigate();
  const query = useWorkoutSessionById(sessionId);
  const { replaceSets, updateStatus } = useWorkoutSessionMutations();
  const rest = useRestTimer();
  const [openIndex, setOpenIndex] = useState(0);
  const [confirm, setConfirm] = useState<'complete' | 'cancel' | 'undo' | null>(null);
  const [undoExercise, setUndoExercise] = useState<WorkoutSessionExerciseResponseDto | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [records, setRecords] = useState<Record<string, Set<number>>>({});
  const loadedSessionId = useRef<string | null>(null);
  const session = query.data;

  useEffect(() => {
    if (session && loadedSessionId.current !== session.id) {
      loadedSessionId.current = session.id;
      setOpenIndex(initialExerciseIndex(session.exercises));
      setActionError(null);
    }
  }, [session]);
  if (!isUuid(sessionId)) {
    return (
      <WorkoutErrorState
        error={
          new ApiError({
            statusCode: 404,
            code: 'NOT_FOUND',
            message: 'This resource is not available.',
            path: '/client/workout',
            timestamp: '',
            requestId: 'invalid',
          })
        }
        retrying={false}
        onRetry={() => {
          void navigate({ to: '/client/training' });
        }}
      />
    );
  }

  if (query.isPending) {
    return <WorkoutLoadingState label={workoutCopy.focus.loadingLabel} />;
  }

  if (query.isError || !session) {
    return (
      <WorkoutErrorState
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const workoutSession = session;
  const total = workoutSession.exercises.reduce(
    (count, exercise) => count + exercise.prescription.sets,
    0,
  );
  const recorded = recordedSetCount(workoutSession);
  const inProgress =
    workoutSession.status === WorkoutSessionResponseDtoStatus.IN_PROGRESS;
  const allRecords = workoutSession.exercises.flatMap((exercise) =>
    exercise.sets
      .filter((set) => isPersonalRecord(set, exercise.previousSets))
      .map((set) => `${exercise.exerciseName} · ${set.setNumber}`),
  );

  async function record(
    exercise: WorkoutSessionExerciseResponseDto,
    draft: SetDraft,
  ) {
    setActionError(null);
    try {
      const nextNumber = exercise.sets.length + 1;
       await replaceSets.mutateAsync({
         sessionId: workoutSession.id,
         sessionExerciseId: exercise.id,
         data: { sets: appendSetPayload(exercise, draft) },
       });
       if (
         isPersonalRecord(
           {
             actualLoadKg: draft.actualLoadKg,
             actualReps: draft.actualReps,
           },
           exercise.previousSets,
         )
       ) {
         setRecords((current) => ({
           ...current,
           [exercise.id]: new Set([
             ...(current[exercise.id] ?? []),
             nextNumber,
           ]),
         }));
         toast.success(workoutCopy.focus.personalRecord);
       }
       rest.start(exercise.prescription.restSeconds);
    } catch (error) {
      setActionError(error);
    }
  }
  async function undo() {
    if (!undoExercise) {
      return;
    }

    try {
      await replaceSets.mutateAsync({
        sessionId: workoutSession.id,
        sessionExerciseId: undoExercise.id,
        data: { sets: withoutLastSetPayload(undoExercise) },
      });
      rest.skip();
      setConfirm(null);
      setUndoExercise(null);
    } catch (error) {
      setActionError(error);
    }
  }

  async function update(status: UpdateWorkoutSessionStatusDtoStatus) {
    try {
      await updateStatus.mutateAsync({
        sessionId: workoutSession.id,
        data: { status },
      });
      setConfirm(null);

      if (status === UpdateWorkoutSessionStatusDtoStatus.CANCELLED) {
        void navigate({ to: '/client/training' });
      }
    } catch (error) {
      setActionError(error);
    }
  }

  if (!inProgress) {
    return (
      <PageContainer density="client" className="mx-auto max-w-lg pb-8">
        {workoutSession.status === WorkoutSessionResponseDtoStatus.COMPLETED ? (
          <WorkoutSummary session={workoutSession} records={allRecords} />
        ) : (
          <section className="client-surface-card space-y-4">
            <CircleX className="size-6 text-muted-foreground" />
            <h1 className="text-xl font-semibold">
              {workoutCopy.focus.cancelledTitle}
            </h1>
            <Link to="/client/training" className="text-primary underline">
              {workoutCopy.focus.backToTraining}
            </Link>
          </section>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer
      density="client"
      className={`mx-auto max-w-lg min-w-0 ${rest.isResting ? 'pb-48' : 'pb-8'}`}
    >
      <SessionHeader
        workoutName={workoutSession.workoutName}
        startedAt={workoutSession.startedAt}
        recorded={recorded}
        total={total}
        canFinish={recorded > 0}
        pending={updateStatus.isPending}
        onFinish={() => setConfirm('complete')}
      />
      <main className="space-y-4 pt-4">
        {actionError ? (
          <Alert variant="danger">
            <p>{mapApiError(actionError).description}</p>
          </Alert>
        ) : null}
        {isStaleSession(workoutSession.startedAt) ? (
          <StaleSessionAlert startedAt={workoutSession.startedAt} />
        ) : null}
        <ExerciseAccordion
          exercises={workoutSession.exercises}
          openIndex={openIndex}
          pending={replaceSets.isPending}
          prSets={records}
          onOpen={setOpenIndex}
          onRecord={record}
          onUndo={(exercise) => {
            setUndoExercise(exercise);
            setConfirm('undo');
          }}
        />
        <Button
          variant="outline"
          className="min-h-12 w-full"
          onClick={() => setConfirm('cancel')}
        >
          {workoutCopy.focus.cancel}
        </Button>
      </main>
      {rest.isResting ? (
        <RestBar
          remainingSeconds={rest.remainingSeconds}
          durationSeconds={rest.durationSeconds}
          onAdjust={rest.adjust}
          onSkip={rest.skip}
        />
      ) : null}
      <ConfirmSheet
        open={confirm === 'complete'}
        onOpenChange={(open) => setConfirm(open ? 'complete' : null)}
        title={workoutCopy.focus.completeTitle}
        description={workoutCopy.focus.completeBody}
        confirmLabel={workoutCopy.focus.completeConfirm}
        cancelLabel={workoutCopy.focus.keepTraining}
        pending={updateStatus.isPending}
        onConfirm={() => {
          void update(UpdateWorkoutSessionStatusDtoStatus.COMPLETED);
        }}
      />
      <ConfirmSheet
        open={confirm === 'cancel'}
        onOpenChange={(open) => setConfirm(open ? 'cancel' : null)}
        title={workoutCopy.focus.cancelTitle}
        description={workoutCopy.focus.cancelBody}
        confirmLabel={workoutCopy.focus.cancelConfirm}
        cancelLabel={workoutCopy.focus.keepTraining}
        pending={updateStatus.isPending}
        danger
        onConfirm={() => {
          void update(UpdateWorkoutSessionStatusDtoStatus.CANCELLED);
        }}
      />
      <ConfirmSheet
        open={confirm === 'undo'}
        onOpenChange={(open) => setConfirm(open ? 'undo' : null)}
        title={workoutCopy.focus.undoTitle}
        description={workoutCopy.focus.undoBody}
        confirmLabel={workoutCopy.focus.undoConfirm}
        cancelLabel={workoutCopy.focus.keepSets}
        pending={replaceSets.isPending}
        danger
        onConfirm={() => {
          void undo();
        }}
      />
    </PageContainer>
  );
}
