import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CheckCircle2, CircleX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import {
  motionTransition,
  revealHidden,
  revealVisible,
  useReducedMotion,
} from '@/shared/lib/motion';
import { ApiError, mapApiError } from '@/shared/errors/api-error';
import {
  UpdateWorkoutSessionStatusDtoStatus,
  WorkoutSessionPrescriptionResponseDtoType,
  WorkoutSessionResponseDtoStatus,
} from '@/generated/models';
import { workoutCopy } from '@/features/workout-session/copy';
import { ConfirmSheet } from '@/features/workout-session/components/confirm-sheet';
import { ExerciseFocus } from '@/features/workout-session/components/exercise-focus';
import { RestTimer } from '@/features/workout-session/components/rest-timer';
import { SetLogger } from '@/features/workout-session/components/set-logger';
import { WorkoutErrorState } from '@/features/workout-session/components/workout-error-state';
import { WorkoutLoadingState } from '@/features/workout-session/components/workout-loading-state';
import { useRestTimer } from '@/features/workout-session/hooks/use-rest-timer';
import {
  useWorkoutSessionById,
  useWorkoutSessionMutations,
} from '@/features/workout-session/hooks/use-workout-session';
import {
  appendSetPayload,
  createSetDraft,
  withoutLastSetPayload,
  type SetDraft,
} from '@/features/workout-session/lib/set-payload';
import {
  clampExerciseIndex,
  initialExerciseIndex,
  isSessionInProgress,
  recordedSetCount,
} from '@/features/workout-session/lib/session-helpers';
import { isUuid } from '@/features/workout-session/lib/session-ids';

export function WorkoutFocusPage() {
  const { sessionId } = useParams({ from: '/client/workout/$sessionId' });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const sessionQuery = useWorkoutSessionById(sessionId);
  const { replaceSets, updateStatus } = useWorkoutSessionMutations();
  const rest = useRestTimer();
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [draft, setDraft] = useState<SetDraft>({
    actualLoadKg: 0,
    actualReps: 0,
    actualDurationSeconds: 0,
  });
  const [confirm, setConfirm] = useState<'complete' | 'cancel' | 'undo' | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const session = sessionQuery.data;
  const exercises = session?.exercises ?? [];
  const safeIndex = clampExerciseIndex(exerciseIndex, exercises.length);
  const activeExercise = exercises[safeIndex];

  useEffect(() => {
    if (!session) {
      return;
    }
    setExerciseIndex(initialExerciseIndex(session.exercises));
    rest.skip();
    setActionError(null);
    // Session identity only: do not reset the selected exercise on every set write.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rest.skip is stable for this screen's purpose
  }, [session?.id]);

  useEffect(() => {
    if (!activeExercise) {
      return;
    }
    setDraft(createSetDraft(activeExercise));
    rest.skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- changing exercise resets local rest/draft only
  }, [activeExercise?.id]);

  const inProgress = session ? isSessionInProgress(session) : false;
  const hasSets = session ? recordedSetCount(session) > 0 : false;
  const durationExercise =
    activeExercise?.prescription.type ===
    WorkoutSessionPrescriptionResponseDtoType.DURATION;
  const mappedActionError = actionError ? mapApiError(actionError) : null;
  const pendingWrite = replaceSets.isPending || updateStatus.isPending;

  const recordedSummary = useMemo(() => {
    if (!session) {
      return [];
    }
    return session.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => ({
        key: set.id,
        label: `${exercise.exerciseName} · ${set.setNumber}`,
      })),
    );
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
            timestamp: '2026-09-04T00:00:00.000Z',
            requestId: 'client-invalid-session',
          })
        }
        retrying={false}
        onRetry={() => {
          void navigate({ to: '/client/training' });
        }}
      />
    );
  }

  if (sessionQuery.isPending) {
    return <WorkoutLoadingState label={workoutCopy.focus.loadingLabel} />;
  }

  if (sessionQuery.isError || !session) {
    return (
      <WorkoutErrorState
        error={sessionQuery.error}
        retrying={sessionQuery.isFetching}
        onRetry={() => {
          if (!sessionQuery.isFetching) {
            void sessionQuery.refetch();
          }
        }}
      />
    );
  }

  async function logSet() {
    if (!activeExercise || !session) {
      return;
    }
    setActionError(null);
    try {
      await replaceSets.mutateAsync({
        sessionId: session.id,
        sessionExerciseId: activeExercise.id,
        data: { sets: appendSetPayload(activeExercise, draft) },
      });
      rest.start(activeExercise.prescription.restSeconds);
    } catch (error) {
      setActionError(error);
    }
  }

  async function undoLastSet() {
    if (!activeExercise || !session || activeExercise.sets.length === 0) {
      return;
    }
    setActionError(null);
    try {
      await replaceSets.mutateAsync({
        sessionId: session.id,
        sessionExerciseId: activeExercise.id,
        data: { sets: withoutLastSetPayload(activeExercise) },
      });
      rest.skip();
      setConfirm(null);
    } catch (error) {
      setActionError(error);
    }
  }

  async function patchStatus(status: (typeof UpdateWorkoutSessionStatusDtoStatus)[keyof typeof UpdateWorkoutSessionStatusDtoStatus]) {
    if (!session) {
      return;
    }
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        sessionId: session.id,
        data: { status },
      });
      setConfirm(null);
      toast.success(
        status === UpdateWorkoutSessionStatusDtoStatus.COMPLETED
          ? workoutCopy.toast.completed
          : workoutCopy.toast.cancelled,
      );
      await navigate({ to: '/client/training' });
    } catch (error) {
      setActionError(error);
    }
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0 pb-8">
      <header className="mb-6 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {workoutCopy.focus.eyebrow}
        </p>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
          {session.workoutName}
        </h1>
      </header>

      {mappedActionError ? (
        <Alert variant="danger" className="mb-5">
          <p className="font-medium">{mappedActionError.title}</p>
          <p className="mt-1 text-muted-foreground">{mappedActionError.description}</p>
        </Alert>
      ) : null}

      {!inProgress ? (
        <motion.section
          className="client-surface-card space-y-4"
          initial={revealHidden(reduceMotion)}
          animate={revealVisible}
          transition={motionTransition('fast', reduceMotion)}
        >
          <div className="flex items-start gap-3">
            {session.status === WorkoutSessionResponseDtoStatus.COMPLETED ? (
              <CheckCircle2 className="mt-0.5 size-6 text-success" aria-hidden />
            ) : (
              <CircleX className="mt-0.5 size-6 text-muted-foreground" aria-hidden />
            )}
            <h2 className="text-lg font-semibold tracking-tight">
              {session.status === WorkoutSessionResponseDtoStatus.COMPLETED
                ? workoutCopy.focus.completedTitle
                : workoutCopy.focus.cancelledTitle}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{workoutCopy.focus.terminalHint}</p>
          {recordedSummary.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recordedSummary.map((item) => (
                <li key={item.key}>{item.label}</li>
              ))}
            </ul>
          ) : null}
          <Link
            to="/client/training"
            className="inline-flex min-h-12 items-center font-medium underline-offset-4 hover:underline"
          >
            {workoutCopy.focus.backToTraining}
          </Link>
        </motion.section>
      ) : exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">{workoutCopy.focus.noExercises}</p>
      ) : activeExercise ? (
        <div className="space-y-6">
          <ExerciseFocus
            exercise={activeExercise}
            index={safeIndex}
            total={exercises.length}
            onPrevious={() => setExerciseIndex((value) => Math.max(0, value - 1))}
            onNext={() =>
              setExerciseIndex((value) => Math.min(exercises.length - 1, value + 1))
            }
          />

          <AnimatePresence initial={false} mode="popLayout">
            {rest.isResting || rest.isComplete ? (
              <motion.div
                key="rest-timer"
                initial={revealHidden(reduceMotion)}
                animate={revealVisible}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={motionTransition('fast', reduceMotion)}
              >
                <RestTimer
                  remainingSeconds={rest.remainingSeconds}
                  complete={rest.isComplete}
                  onSkip={rest.skip}
                />
              </motion.div>
            ) : (
              <motion.div
                key="set-logger"
                initial={revealHidden(reduceMotion)}
                animate={revealVisible}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={motionTransition('fast', reduceMotion)}
              >
                <SetLogger
                  draft={draft}
                  durationExercise={durationExercise}
                  pending={replaceSets.isPending}
                  onChange={setDraft}
                  onLog={() => {
                    void logSet();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {activeExercise.sets.length > 0 ? (
            <Button
              variant="ghost"
              className="min-h-12 w-full"
              disabled={pendingWrite}
              onClick={() => setConfirm('undo')}
            >
              {workoutCopy.focus.undoLastSet}
            </Button>
          ) : null}

          <div className="space-y-3 pt-2">
            {!hasSets ? (
              <p className="text-sm text-muted-foreground">
                {workoutCopy.focus.completeNeedSets}
              </p>
            ) : null}
            <Button
              className="min-h-14 w-full"
              disabled={!hasSets || pendingWrite}
              onClick={() => setConfirm('complete')}
            >
              {workoutCopy.focus.complete}
            </Button>
            <Button
              variant="outline"
              className="min-h-12 w-full"
              disabled={pendingWrite}
              onClick={() => setConfirm('cancel')}
            >
              {workoutCopy.focus.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmSheet
        open={confirm === 'complete'}
        onOpenChange={(open) => setConfirm(open ? 'complete' : null)}
        title={workoutCopy.focus.completeTitle}
        description={workoutCopy.focus.completeBody}
        confirmLabel={
          updateStatus.isPending ? workoutCopy.focus.completing : workoutCopy.focus.completeConfirm
        }
        cancelLabel={workoutCopy.focus.keepTraining}
        pending={updateStatus.isPending}
        onConfirm={() => {
          void patchStatus(UpdateWorkoutSessionStatusDtoStatus.COMPLETED);
        }}
      />
      <ConfirmSheet
        open={confirm === 'cancel'}
        onOpenChange={(open) => setConfirm(open ? 'cancel' : null)}
        title={workoutCopy.focus.cancelTitle}
        description={workoutCopy.focus.cancelBody}
        confirmLabel={
          updateStatus.isPending ? workoutCopy.focus.cancelling : workoutCopy.focus.cancelConfirm
        }
        cancelLabel={workoutCopy.focus.keepTraining}
        pending={updateStatus.isPending}
        danger
        onConfirm={() => {
          void patchStatus(UpdateWorkoutSessionStatusDtoStatus.CANCELLED);
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
          void undoLastSet();
        }}
      />
    </PageContainer>
  );
}
